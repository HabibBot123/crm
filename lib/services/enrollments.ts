import type { SupabaseClient } from "@supabase/supabase-js"

export type CreateManualEnrollmentParams = {
  supabase: SupabaseClient
  organizationId: number
  offerId: number
  buyerEmail: string
  buyerName?: string | null
  priceCents?: number | null
  /** null = lifetime; undefined = use offer.access_duration_months */
  accessDurationMonths?: number | null
}

export type CreateManualEnrollmentResult = {
  enrollmentId: number
  saleId: number
  userId: string | null
  expiresAt: string | null
}

async function resolveUserIdByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_user_id_by_email", {
    p_email: email,
  })
  if (error) {
    console.error("get_user_id_by_email failed:", error.message)
    return null
  }
  if (data == null) return null
  if (typeof data !== "string") return null
  return data
}

async function supersedePriorEnrollments(
  supabase: SupabaseClient,
  args: {
    offerId: number
    userId: string | null
    buyerEmail: string
    keepEnrollmentId: number
  }
): Promise<void> {
  const supersededAt = new Date().toISOString()
  let query = supabase
    .from("enrollments")
    .update({
      status: "expired",
      expires_at: supersededAt,
    })
    .eq("offer_id", args.offerId)
    .in("status", ["active", "paused"])
    .neq("id", args.keepEnrollmentId)

  if (args.userId) {
    query = query.or(`user_id.eq.${args.userId},buyer_email.eq.${args.buyerEmail}`)
  } else {
    query = query.eq("buyer_email", args.buyerEmail)
  }

  const { error } = await query
  if (error) {
    throw new Error(`Failed to expire prior enrollments: ${error.message}`)
  }
}

/**
 * Coach-created enrollment + organization_sales (source=manual).
 * No Stripe IDs. Forces sale billing_type=one_time.
 * Sets expires_at from accessDurationMonths (or offer default). null months = lifetime.
 */
export async function createManualEnrollment(
  params: CreateManualEnrollmentParams
): Promise<CreateManualEnrollmentResult> {
  const { supabase, organizationId, offerId } = params
  const buyerEmail = params.buyerEmail.trim().toLowerCase()
  const buyerName = params.buyerName?.trim() || null

  if (!buyerEmail) {
    throw new Error("Buyer email is required")
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select(
      "id, organization_id, title, status, price, currency, access_duration_months, offer_products(id)"
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (offerError) {
    throw new Error(offerError.message)
  }
  if (!offer) {
    throw new Error("Offer not found in this organization")
  }
  if (offer.status !== "active") {
    throw new Error("Only active offers can be used for manual enrollment")
  }

  const products = offer.offer_products
  const productCount = Array.isArray(products) ? products.length : 0
  if (productCount === 0) {
    throw new Error("Offer has no products — add products before enrolling")
  }

  const priceCents =
    params.priceCents != null && Number.isFinite(params.priceCents)
      ? Math.trunc(params.priceCents)
      : offer.price

  if (priceCents < 0) {
    throw new Error("Price cannot be negative")
  }

  const currency =
    typeof offer.currency === "string" && offer.currency.trim()
      ? offer.currency.trim().toLowerCase()
      : "eur"

  const durationMonths =
    params.accessDurationMonths !== undefined
      ? params.accessDurationMonths
      : offer.access_duration_months

  if (durationMonths != null && (!Number.isFinite(durationMonths) || durationMonths <= 0)) {
    throw new Error("Access duration must be a positive number of months, or lifetime")
  }

  let expiresAt: string | null = null
  if (durationMonths != null && durationMonths > 0) {
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths)
    expiresAt = expiryDate.toISOString()
  }

  const userId = await resolveUserIdByEmail(supabase, buyerEmail)

  const { data: inserted, error: enrollError } = await supabase
    .from("enrollments")
    .insert({
      organization_id: organizationId,
      offer_id: offerId,
      user_id: userId,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      status: "active",
      expires_at: expiresAt,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_checkout_session_id: null,
    })
    .select("id")
    .single()

  if (enrollError || !inserted) {
    throw new Error(enrollError?.message ?? "Failed to create enrollment")
  }

  const enrollmentId = inserted.id
  if (typeof enrollmentId !== "number") {
    throw new Error("Invalid enrollment id returned")
  }

  await supersedePriorEnrollments(supabase, {
    offerId,
    userId,
    buyerEmail,
    keepEnrollmentId: enrollmentId,
  })

  const { data: sale, error: saleError } = await supabase
    .from("organization_sales")
    .insert({
      organization_id: organizationId,
      enrollment_id: enrollmentId,
      user_id: userId,
      buyer_email: buyerEmail,
      billing_type: "one_time",
      price: priceCents,
      currency,
      source: "manual",
      stripe_checkout_session_id: null,
      stripe_invoice_id: null,
    })
    .select("id")
    .single()

  if (saleError || !sale) {
    throw new Error(saleError?.message ?? "Enrollment created but sale insert failed")
  }

  const saleId = sale.id
  if (typeof saleId !== "number") {
    throw new Error("Invalid sale id returned")
  }

  return { enrollmentId, saleId, userId, expiresAt }
}
