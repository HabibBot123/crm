import type { SupabaseClient } from "@supabase/supabase-js"
import type { Product } from "./products"

export type BillingType = "subscription" | "one_time" | "installment"
export type OfferStatus = "draft" | "active" | "archived"

export type Offer = {
  id: number
  organization_id: number
  title: string
  description: string | null
  billing_type: BillingType
  price: number
  currency: string
  interval: "month" | "year" | null
  installment_count: number | null
  stripe_price_id: string | null
  stripe_product_id: string | null
  stripe_payment_link: string | null
  key_features: string[] | null
  status: OfferStatus
  created_at: string
  updated_at: string
}

export type OfferProduct = {
  id: number
  offer_id: number
  product_id: number
}

export type OfferVariant = {
  id: number
  offer_id: number
  label: string | null
  price: number | null
  installment_count: number | null
  stripe_price_id: string | null
  stripe_payment_link: string | null
  is_active: boolean
  created_at: string
}

export type Enrollment = {
  id: number
  organization_id: number
  offer_id: number
  offer_variant_id: number | null
  user_id: string | null
  buyer_email: string | null
  status: "active" | "expired" | "cancelled" | "paused"
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  expires_at: string | null
  started_at: string
  created_at: string
  updated_at: string
}

export type OfferProductWithProduct = OfferProduct & {
  products: Pick<Product, "id" | "title" | "type" | "cover_image_url" | "status"> | null
}

export type OfferWithDetails = Offer & {
  offer_products: OfferProductWithProduct[]
  offer_variants: OfferVariant[]
}

export type OfferListItem = Offer & {
  offer_products: { id: number; product_id: number }[]
}

export type OfferFetchScope = "all" | "active"

export type OffersListPage = {
  items: OfferListItem[]
  total: number
}

// ----------------------------------------------------------------
// Fetch
// ----------------------------------------------------------------

export async function fetchOffersPage(
  supabase: SupabaseClient,
  organizationId: number,
  scope: OfferFetchScope,
  page: number,
  pageSize: number
): Promise<OffersListPage> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("offers")
    .select("*, offer_products(id, product_id)", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })

  if (scope === "active") {
    query = query.eq("status", "active")
  }

  const { data, error, count } = await query.range(from, to)

  if (error) throw error
  return {
    items: (data ?? []) as OfferListItem[],
    total: count ?? 0,
  }
}

export async function fetchOffersByOrganization(
  supabase: SupabaseClient,
  organizationId: number,
  scope: OfferFetchScope = "all"
): Promise<OfferListItem[]> {
  let query = supabase
    .from("offers")
    .select("*, offer_products(id, product_id)")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })

  if (scope === "active") {
    query = query.eq("status", "active")
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as OfferListItem[]
}

export async function fetchOfferWithDetails(
  supabase: SupabaseClient,
  offerId: number
): Promise<OfferWithDetails | null> {
  const { data, error } = await supabase
    .from("offers")
    .select(
      `*,
      offer_products(
        id,
        product_id,
        products(id, title, type, cover_image_url, status)
      ),
      offer_variants(*)`
    )
    .eq("id", offerId)
    .single()

  if (error || !data) return null

  const raw = data as Offer & {
    offer_products: (OfferProduct & {
      products: OfferProductWithProduct["products"] | OfferProductWithProduct["products"][] | null
    })[]
    offer_variants: OfferVariant[]
  }

  return {
    ...raw,
    offer_products: (raw.offer_products ?? []).map((op) => ({
      ...op,
      products: Array.isArray(op.products) ? (op.products[0] ?? null) : (op.products ?? null),
    })),
    offer_variants: (raw.offer_variants ?? []).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }
}

// ----------------------------------------------------------------
// Create / Update / Delete — Offer
// ----------------------------------------------------------------

export type CreateOfferInput = {
  organization_id: number
  title: string
  description?: string | null
  key_features?: string[] | null
  billing_type: BillingType
  price: number
  currency?: string
  interval?: "month" | "year" | null
  installment_count?: number | null
  product_ids: number[]
}

export async function createOffer(
  supabase: SupabaseClient,
  input: CreateOfferInput
): Promise<Offer> {
  const sanitizedKeyFeatures = sanitizeKeyFeatures(input.key_features)

  const { data, error } = await supabase
    .from("offers")
    .insert({
      organization_id: input.organization_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      key_features: sanitizedKeyFeatures,
      billing_type: input.billing_type,
      price: input.price,
      currency: input.currency ?? "eur",
      interval: input.interval ?? null,
      installment_count: input.installment_count ?? null,
      status: "draft",
    })
    .select()
    .single()

  if (error) throw error
  const offer = data as Offer

  if (input.product_ids.length > 0) {
    const { error: linkError } = await supabase
      .from("offer_products")
      .insert(input.product_ids.map((pid) => ({ offer_id: offer.id, product_id: pid })))
    if (linkError) throw linkError
  }

  return offer
}

export type UpdateOfferInput = {
  title?: string
  description?: string | null
  key_features?: string[] | null
  price?: number
  currency?: string
  interval?: "month" | "year" | null
  installment_count?: number | null
  stripe_price_id?: string | null
  status?: OfferStatus
}

export async function updateOffer(
  supabase: SupabaseClient,
  offerId: number,
  input: UpdateOfferInput
): Promise<Offer> {
  // Archiving is Stripe-aware and must go through the dedicated API route
  if (input.status === "archived") {
    // First load offer to get its organization id
    const { data: existing, error: existingError } = await supabase
      .from("offers")
      .select("id, organization_id, status")
      .eq("id", offerId)
      .single()

    if (existingError || !existing) {
      throw existingError ?? new Error("Offer not found")
    }

    const orgId = (existing as { organization_id: number }).organization_id

    const res = await fetch("/api/stripe-connect/archive-offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId, offerId }),
    })

    if (!res.ok) {
      let message = "Failed to archive offer"
      try {
        const data = (await res.json()) as { error?: string }
        if (data?.error) message = data.error
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(message)
    }

    // Reload the full offer from Supabase to return fresh data
    const { data: updated, error: reloadError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single()

    if (reloadError || !updated) {
      throw reloadError ?? new Error("Offer archived but failed to reload")
    }

    return updated as Offer
  }

  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.description !== undefined) payload.description = input.description?.trim() || null
  if (input.key_features !== undefined) payload.key_features = sanitizeKeyFeatures(input.key_features)
  if (input.price !== undefined) payload.price = input.price
  if (input.currency !== undefined) payload.currency = input.currency
  if (input.interval !== undefined) payload.interval = input.interval
  if (input.installment_count !== undefined) payload.installment_count = input.installment_count
  if (input.stripe_price_id !== undefined) payload.stripe_price_id = input.stripe_price_id
  if (input.status !== undefined) payload.status = input.status

  const { data, error } = await supabase
    .from("offers")
    .update(payload)
    .eq("id", offerId)
    .select()
    .single()

  if (error) throw error
  return data as Offer
}

function sanitizeKeyFeatures(input?: string[] | null): string[] | null {
  if (!input) return null

  const cleaned = input
    .map((v) => v.trim())
    .filter((v) => v.length > 0)

  if (cleaned.length === 0) return null
  return cleaned.slice(0, 5)
}

export async function deleteOffer(
  supabase: SupabaseClient,
  offerId: number
): Promise<void> {
  throw new Error("Offers cannot be deleted. Archive the offer instead.")
}

// ----------------------------------------------------------------
// Offer products
// ----------------------------------------------------------------

export async function upsertOfferProducts(
  supabase: SupabaseClient,
  offerId: number,
  productIds: number[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("offer_products")
    .delete()
    .eq("offer_id", offerId)
  if (deleteError) throw deleteError

  if (productIds.length > 0) {
    const { error: insertError } = await supabase
      .from("offer_products")
      .insert(productIds.map((pid) => ({ offer_id: offerId, product_id: pid })))
    if (insertError) throw insertError
  }
}

// ----------------------------------------------------------------
// Variants
// ----------------------------------------------------------------

export type CreateOfferVariantInput = {
  label?: string | null
  price?: number | null
  installment_count?: number | null
}

export async function createOfferVariant(
  supabase: SupabaseClient,
  offerId: number,
  input: CreateOfferVariantInput
): Promise<OfferVariant> {
  const { data, error } = await supabase
    .from("offer_variants")
    .insert({
      offer_id: offerId,
      label: input.label?.trim() || null,
      price: input.price ?? null,
      installment_count: input.installment_count ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as OfferVariant
}

export type UpdateOfferVariantInput = {
  label?: string | null
  price?: number | null
  installment_count?: number | null
  stripe_price_id?: string | null
  stripe_payment_link?: string | null
  is_active?: boolean
}

export async function updateOfferVariant(
  supabase: SupabaseClient,
  variantId: number,
  input: UpdateOfferVariantInput
): Promise<OfferVariant> {
  const payload: Record<string, unknown> = {}
  if (input.label !== undefined) payload.label = input.label?.trim() || null
  if (input.price !== undefined) payload.price = input.price
  if (input.installment_count !== undefined) payload.installment_count = input.installment_count
  if (input.stripe_price_id !== undefined) payload.stripe_price_id = input.stripe_price_id
  if (input.stripe_payment_link !== undefined) payload.stripe_payment_link = input.stripe_payment_link
  if (input.is_active !== undefined) payload.is_active = input.is_active

  const { data, error } = await supabase
    .from("offer_variants")
    .update(payload)
    .eq("id", variantId)
    .select()
    .single()

  if (error) throw error
  return data as OfferVariant
}

export async function deleteOfferVariant(
  supabase: SupabaseClient,
  variantId: number
): Promise<void> {
  const { error } = await supabase.from("offer_variants").delete().eq("id", variantId)
  if (error) throw error
}

// ----------------------------------------------------------------
// Enrollments
// ----------------------------------------------------------------

export async function fetchEnrollmentsByOffer(
  supabase: SupabaseClient,
  offerId: number
): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("offer_id", offerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Enrollment[]
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Derives the billing type from a list of product types.
 * - All course → subscription
 * - Any coaching (alone or mixed) → one_time (can be upgraded to installment by user)
 */
export function deriveBillingType(productTypes: ("course" | "coaching")[]): BillingType {
  const hasCoaching = productTypes.some((t) => t === "coaching")
  return hasCoaching ? "one_time" : "subscription"
}
