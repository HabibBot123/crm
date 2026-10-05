import type { SupabaseAdmin } from "../types"
import { resolveUserIdByEmail } from "../helpers"
import { checkoutSessionCompletedSchema } from "../schemas"

/**
 * Each paid checkout creates a new enrollment (new contract).
 * Prior active/paused enrollments for the same offer + buyer are expired after insert.
 * Idempotent on Stripe checkout session id (webhook retries).
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
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle()

  if (alreadyProcessed) {
    console.info(
      `checkout.session.completed [${session.id}]: enrollment ${alreadyProcessed.id} already exists — skipping`
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
    .select("id")
    .single()

  if (enrollError) {
    if (enrollError.code === "23505") {
      console.info(
        `checkout.session.completed [${session.id}]: concurrent insert won — treating as success`
      )
      return
    }
    console.error(
      `Failed to create enrollment for offer ${offerId} / email "${buyerEmail}":`,
      enrollError.message
    )
    return
  }

  const enrollmentId = inserted?.id
  if (enrollmentId == null) {
    console.error(
      `checkout.session.completed [${session.id}]: insert returned no enrollment id`
    )
    return
  }

  const supersededAt = new Date().toISOString()
  const { error: supersedeError } = await supersedePriorEnrollments(supabase, {
    offerId,
    userId,
    buyerEmail,
    keepEnrollmentId: enrollmentId,
    supersededAt,
  })

  if (supersedeError) {
    console.error(
      `checkout.session.completed [${session.id}]: created enrollment ${enrollmentId} but failed to expire prior ones:`,
      supersedeError.message
    )
    return
  }

  console.log(
    `Enrollment created: id ${enrollmentId}, offer ${offerId}, user ${userId ?? "pending"}, email "${buyerEmail}", expires ${expiresAt ?? "never"}`
  )
}

async function supersedePriorEnrollments(
  supabase: SupabaseAdmin,
  args: {
    offerId: number
    userId: string | null
    buyerEmail: string
    keepEnrollmentId: number
    supersededAt: string
  }
): Promise<{ error: { message: string } | null }> {
  const { offerId, userId, buyerEmail, keepEnrollmentId, supersededAt } = args

  let query = supabase
    .from("enrollments")
    .update({
      status: "expired",
      expires_at: supersededAt,
    })
    .eq("offer_id", offerId)
    .in("status", ["active", "paused"])
    .neq("id", keepEnrollmentId)

  if (userId) {
    query = query.or(`user_id.eq.${userId},buyer_email.eq.${buyerEmail}`)
  } else {
    query = query.eq("buyer_email", buyerEmail)
  }

  const { error } = await query
  return { error }
}
