import type { SupabaseAdmin } from "../types"
import { resolveUserIdByEmail } from "../helpers"
import { checkoutSessionCompletedSchema } from "../schemas"

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

  const buyerEmail =
    session.customer_details?.email?.trim().toLowerCase() ?? null
  const buyerName = session.customer_details?.name?.trim() || null
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

  const { data: offerProducts, error: opError } = await supabase
    .from("offer_products")
    .select("product_id, products(type)")
    .eq("offer_id", offerId)

  if (opError) {
    console.error(
      `checkout.session.completed [${session.id}]: failed to fetch offer_products:`,
      opError.message
    )
  }

  if (offerProducts) {
    type OpRow = {
      product_id: number
      products: { type: string } | { type: string }[] | null
    }
    const rows = offerProducts as unknown as OpRow[]
    const getType = (p: OpRow["products"]): string | undefined =>
      Array.isArray(p) ? p[0]?.type : p?.type
    const coachingProductId = rows.find((op) => getType(op.products) === "coaching")?.product_id

    if (coachingProductId) {
      const { data: coaching, error: coachingError } = await supabase
        .from("product_coaching")
        .select("period_months")
        .eq("product_id", coachingProductId)
        .single()

      if (coachingError) {
        console.error(
          `checkout.session.completed [${session.id}]: failed to fetch product_coaching for product ${coachingProductId}:`,
          coachingError.message
        )
      } else if (coaching?.period_months) {
        const expiryDate = new Date()
        expiryDate.setMonth(expiryDate.getMonth() + coaching.period_months)
        expiresAt = expiryDate.toISOString()
        console.log(
          `checkout.session.completed [${session.id}]: coaching period_months=${coaching.period_months} → expires_at=${expiresAt}`
        )
      } else {
        console.warn(
          `checkout.session.completed [${session.id}]: coaching product ${coachingProductId} has no period_months set`
        )
      }
    }
  }

  let enrollError: { message: string } | null = null
  let enrollmentId: number | null = null

  if (userId) {
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("offer_id", offerId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from("enrollments")
        .update({
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          status: "active",
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: session.subscription ?? null,
          expires_at: expiresAt,
          offer_variant_id: variantId,
        })
        .eq("id", existing.id)
      enrollError = error
      enrollmentId = existing.id
    } else {
      const { data: inserted, error } = await supabase
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
          expires_at: expiresAt,
        })
        .select("id")
        .single()
      enrollError = error
      enrollmentId = inserted?.id ?? null
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("enrollments")
      .insert({
        organization_id: organizationId,
        offer_id: offerId,
        offer_variant_id: variantId,
        user_id: null,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        status: "active",
        stripe_customer_id: session.customer ?? null,
        stripe_subscription_id: session.subscription ?? null,
        expires_at: expiresAt,
      })
      .select("id")
      .single()
    enrollError = error
    enrollmentId = inserted?.id ?? null
  }

  if (enrollError) {
    console.error(
      `Failed to create enrollment for offer ${offerId} / email "${buyerEmail}":`,
      enrollError.message
    )
  } else {
    console.log(
      `Enrollment created: offer ${offerId}, user ${userId ?? "pending"}, name "${buyerName ?? "—"}", email "${buyerEmail}", expires ${expiresAt ?? "never"}`
    )
  }
}
