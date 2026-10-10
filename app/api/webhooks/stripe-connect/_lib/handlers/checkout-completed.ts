import type { SupabaseAdmin } from "../types"
import {
  getBillingTypeForEnrollment,
  recordStripeSale,
  resolveUserIdByEmail,
} from "../helpers"
import { checkoutSessionCompletedSchema } from "../schemas"
import { z } from "zod"

const enrollmentInsertResultSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  offer_id: z.number(),
  offer_variant_id: z.number().nullable(),
  user_id: z.string().nullable(),
  buyer_email: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
})

/**
 * Each paid checkout creates a new enrollment (new contract).
 * Prior active/paused enrollments for the same offer + buyer are expired before insert
 * (so repurchase works even if the previous contract still had days left).
 * Idempotent on Stripe checkout session id (webhook retries).
 * Also records organization_sales when amount_total > 0 (money path).
 */
export async function handleCheckoutSessionCompleted(
  supabase: SupabaseAdmin,
  rawObject: unknown
): Promise<void> {
  const parse = checkoutSessionCompletedSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("checkout.session.completed: invalid payload", parse.error.flatten())
    return
  }
  const session = parse.data

  const offerId = session.metadata?.offer_id ? Number(session.metadata.offer_id) : null
  const organizationId = session.metadata?.organization_id
    ? Number(session.metadata.organization_id)
    : null
  const variantId = session.metadata?.variant_id ? Number(session.metadata.variant_id) : null

  if (!offerId || !organizationId) {
    console.warn(
      `checkout.session.completed [${session.id}]: missing offer_id or organization_id in metadata — skipping`
    )
    return
  }

  const { data: alreadyProcessed } = await supabase
    .from("enrollments")
    .select(
      "id, organization_id, offer_id, offer_variant_id, user_id, buyer_email, stripe_checkout_session_id"
    )
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle()

  if (alreadyProcessed) {
    const existing = enrollmentInsertResultSchema.safeParse(alreadyProcessed)
    if (existing.success) {
      await maybeRecordCheckoutSale(supabase, session, existing.data)
    }
    console.info(
      `checkout.session.completed [${session.id}]: enrollment ${alreadyProcessed.id} already exists — ensuring sale`
    )
    return
  }

  const buyerEmail =
    session.customer_details?.email?.trim().toLowerCase() ?? null
  const buyerName =
    session.customer_details?.name?.trim() ||
    session.customer_details?.individual_name?.trim() ||
    null
  if (!buyerEmail) {
    console.warn(
      `checkout.session.completed [${session.id}]: no customer email — cannot create enrollment`
    )
    return
  }

  const userId = await resolveUserIdByEmail(supabase, buyerEmail)
  if (!userId) {
    console.info(
      `checkout.session.completed [${session.id}]: no Supabase user for "${buyerEmail}" — enrollment saved without user_id (will reconcile at sign-in)`
    )
  }

  let expiresAt: string | null = null

  const { data: offerRow, error: offerError } = await supabase
    .from("offers")
    .select("id, access_duration_months")
    .eq("id", offerId)
    .single()

  if (offerError) {
    console.error(
      `checkout.session.completed [${session.id}]: failed to fetch offer:`,
      offerError.message
    )
  } else if (offerRow?.access_duration_months != null && offerRow.access_duration_months > 0) {
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + offerRow.access_duration_months)
    expiresAt = expiryDate.toISOString()
    console.log(
      `checkout.session.completed [${session.id}]: access_duration_months=${offerRow.access_duration_months} → expires_at=${expiresAt}`
    )
  }

  const supersededAt = new Date().toISOString()
  const { error: supersedeError } = await supersedePriorEnrollments(supabase, {
    offerId,
    userId,
    buyerEmail,
    supersededAt,
  })

  if (supersedeError) {
    console.error(
      `checkout.session.completed [${session.id}]: failed to expire prior enrollments:`,
      supersedeError.message
    )
    return
  }

  const { data: inserted, error: enrollError } = await supabase
    .from("enrollments")
    .insert({
      organization_id: organizationId,
      offer_id: offerId,
      offer_variant_id: variantId,
      user_id: userId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      status: "active",
      stripe_customer_id: session.customer ?? null,
      stripe_subscription_id: session.subscription ?? null,
      stripe_checkout_session_id: session.id,
      expires_at: expiresAt,
    })
    .select(
      "id, organization_id, offer_id, offer_variant_id, user_id, buyer_email, stripe_checkout_session_id"
    )
    .single()

  if (enrollError) {
    if (enrollError.code === "23505") {
      console.info(
        `checkout.session.completed [${session.id}]: concurrent insert won, treating as success`
      )
      const { data: raced } = await supabase
        .from("enrollments")
        .select(
          "id, organization_id, offer_id, offer_variant_id, user_id, buyer_email, stripe_checkout_session_id"
        )
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle()
      const racedParsed = enrollmentInsertResultSchema.safeParse(raced)
      if (racedParsed.success) {
        await maybeRecordCheckoutSale(supabase, session, racedParsed.data)
      }
      return
    }
    console.error(
      `Failed to create enrollment for offer ${offerId} / email "${buyerEmail}":`,
      enrollError.message
    )
    return
  }

  const enrollment = enrollmentInsertResultSchema.safeParse(inserted)
  if (!enrollment.success) {
    console.error(
      `checkout.session.completed [${session.id}]: insert returned invalid enrollment`
    )
    return
  }

  await maybeRecordCheckoutSale(supabase, session, enrollment.data)

  console.log(
    `Enrollment created: id ${enrollment.data.id}, offer ${offerId}, user ${userId ?? "pending"}, email "${buyerEmail}", expires ${expiresAt ?? "never"}`
  )
}

async function maybeRecordCheckoutSale(
  supabase: SupabaseAdmin,
  session: z.infer<typeof checkoutSessionCompletedSchema>,
  enrollment: z.infer<typeof enrollmentInsertResultSchema>
): Promise<void> {
  const amountTotal = session.amount_total ?? 0
  if (amountTotal <= 0) return

  // Unpaid / no_payment_required (e.g. trial) — money event comes later via invoice.paid
  if (
    session.payment_status != null &&
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    console.info(
      `checkout.session.completed [${session.id}]: payment_status=${session.payment_status} — skipping sale`
    )
    return
  }

  if (session.payment_status === "no_payment_required") return

  const billingType = await getBillingTypeForEnrollment(supabase, enrollment)
  const currency = (session.currency ?? "eur").toLowerCase()

  const recorded = await recordStripeSale(supabase, {
    organizationId: enrollment.organization_id,
    enrollment,
    priceCents: amountTotal,
    currency,
    billingType,
    stripeCheckoutSessionId: session.id,
    stripeInvoiceId: null,
    metadata: session.metadata ?? null,
  })

  console.log(
    `checkout.session.completed [${session.id}]: organization_sales ${recorded.status} id=${recorded.saleId} (amount ${amountTotal} ${currency})`
  )

  if (recorded.status === "inserted" && recorded.saleId != null) {
    const { maybeCreateOnPaymentCommissionsForSale } = await import(
      "@/lib/services/commissions"
    )
    try {
      await maybeCreateOnPaymentCommissionsForSale(supabase, recorded.saleId)
    } catch (err) {
      console.error(
        `checkout.session.completed [${session.id}]: on_payment commissions failed:`,
        err
      )
    }
  }
}

async function supersedePriorEnrollments(
  supabase: SupabaseAdmin,
  args: {
    offerId: number
    userId: string | null
    buyerEmail: string
    supersededAt: string
    keepEnrollmentId?: number | null
  }
): Promise<{ error: { message: string } | null }> {
  const { offerId, userId, buyerEmail, supersededAt, keepEnrollmentId } = args

  let query = supabase
    .from("enrollments")
    .update({
      status: "expired",
      expires_at: supersededAt,
    })
    .eq("offer_id", offerId)
    .in("status", ["active", "paused"])

  if (keepEnrollmentId != null) {
    query = query.neq("id", keepEnrollmentId)
  }

  if (userId) {
    query = query.or(`user_id.eq.${userId},buyer_email.eq.${buyerEmail}`)
  } else {
    query = query.eq("buyer_email", buyerEmail)
  }

  const { error } = await query
  return { error }
}
