import type { SupabaseClient } from "@supabase/supabase-js"
import { parseOrganizationBrandingJson } from "@/schemas/organization-branding.schema"
import type { BillingType } from "./offers"

export type OrganizationBranding = {
  logo_url?: string | null
  hero_image_url?: string | null
  description?: string | null
  bio?: string | null
  credentials?: { icon: string; text: string }[] | null
  primary_color?: string | null
  secondary_color?: string | null
  tagline?: string | null
  cta_text?: string | null
  offers_section_title?: string | null
  footer_cta_text?: string | null
  stats?: { value: string; label: string }[] | null
  testimonials?: { author: string; role?: string | null; text: string; rating?: number | null }[] | null
  faq?: { question: string; answer: string }[] | null
  offers_display?: {
    visible_offer_ids: number[]
    featured_offer_id: number | null
  } | null
}

export type OrganizationDisplay = {
  id: number
  name: string
  slug: string
  stripe_account_id: string | null
  stripe_onboarding_completed: boolean
  branding?: OrganizationBranding | null
}

/**
 * Organization with current user's membership for dashboard.
 * Merges organization_members row (id, role) with organizations row; we expose:
 * - member_id: organization_members.id (the membership row id)
 * - member_role: organization_members.role (e.g. "admin")
 */
export type Organization = OrganizationDisplay & {
  member_id: number | null
  member_role: string | null
}

export async function fetchOrganizationsByIds(
  supabase: SupabaseClient,
  ids: number[]
): Promise<OrganizationDisplay[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, stripe_account_id, stripe_onboarding_completed, branding")
    .in("id", ids)
    .is("deleted_at", null)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as OrganizationDisplay[]
}

/** Fetch organizations for a user: query organization_members (user_id) + join organizations (single query). */
export async function fetchOrganizationsWithMember(
  supabase: SupabaseClient,
  userId: string
): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      role,
      organizations(id,name,slug,stripe_account_id,stripe_onboarding_completed)
    `
    )
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) throw error

  const rows = (data ?? []) as {
    id: number
    role: string
    organizations: OrganizationDisplay | OrganizationDisplay[] | null
  }[]

  const result: Organization[] = []
  for (const row of rows) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
    if (!org) continue
    result.push({
      ...org,
      member_id: row.id,
      member_role: row.role,
    })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

/** Dashboard: load `organizations.branding` for one org (Supabase RLS). */
export async function fetchOrganizationBranding(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrganizationBranding | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("branding")
    .eq("id", organizationId)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return parseOrganizationBrandingJson(data.branding)
}

// ----------------------------------------------------------------
// Public (by slug)
// ----------------------------------------------------------------

export type OrganizationPublic = {
  id: number
  name: string
  slug: string
  branding: OrganizationBranding | null
}

export async function fetchOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<OrganizationPublic | null> {
  if (!slug || typeof slug !== "string") return null

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, branding")
    .eq("slug", slug.trim().toLowerCase())
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  return data as OrganizationPublic | null
}

export type PublicOrgOffer = {
  id: number
  title: string
  description: string | null
  price: number
  currency: string
  interval: "month" | "year" | null
  installment_count: number | null
  stripe_payment_link: string | null
  billing_type: BillingType
  key_features: string[] | null
  products: {
    id: number
    title: string
    type: string
    cover_image_url: string | null
  }[]
}

export type PublicOrgResponse = {
  organization: OrganizationPublic
  offers: PublicOrgOffer[]
}

export async function fetchPublicOrganizationBySlug(
  baseUrl: string,
  slug: string
): Promise<PublicOrgResponse | null> {
  const normalizedSlug = slug.trim().toLowerCase()
  const url = new URL(`/api/public/org/${encodeURIComponent(normalizedSlug)}`, baseUrl)
  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Unable to load organization"
    throw new Error(message)
  }

  return (await res.json()) as PublicOrgResponse
}

// ----------------------------------------------------------------
// Public: one offer (pack) + coach by slug (for buy page)
// ----------------------------------------------------------------

export type PublicOfferVariant = {
  id: number
  label: string | null
  price: number
  installment_count: number | null
}

export type PublicOfferPayload = {
  id: number
  title: string
  description: string | null
  key_features: string[] | null
  products: {
    id: number
    title: string
    type: string
    cover_image_url: string | null
  }[]
  price: number
  currency: string
  interval: "month" | "year" | null
  billing_type: BillingType
  installment_count: number | null
  variant: PublicOfferVariant | null
}

export type PublicOfferWithOrgResponse = {
  organization: OrganizationPublic
  offer: PublicOfferPayload
}

export async function getPublicOfferWithOrg(
  baseUrl: string,
  slug: string,
  offerId: number,
  variantId: number | null
): Promise<PublicOfferWithOrgResponse | null> {
  const url = new URL(
    `/api/public/org/${encodeURIComponent(slug)}/offer/${offerId}`,
    baseUrl
  )
  if (variantId != null && Number.isFinite(variantId) && variantId > 0) {
    url.searchParams.set("variantId", String(variantId))
  }

  const res = await fetch(url.toString())

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Unable to load offer. Please try again."
    throw new Error(message)
  }

  return (await res.json()) as PublicOfferWithOrgResponse
}

export type UpdateOrganizationBrandingInput = {
  logo_url?: string | null
  description?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  tagline?: string | null
  cta_text?: string | null
  offers_section_title?: string | null
  footer_cta_text?: string | null
  bio?: string | null
  credentials?: OrganizationBranding["credentials"]
  stats?: OrganizationBranding["stats"]
  testimonials?: OrganizationBranding["testimonials"]
  faq?: OrganizationBranding["faq"]
  offers_display?: OrganizationBranding["offers_display"]
  hero_image_url?: string | null
}

export async function updateOrganizationBranding(
  supabase: SupabaseClient,
  organizationId: number,
  input: UpdateOrganizationBrandingInput
): Promise<OrganizationBranding> {
  const { data: orgRow, error: fetchError } = await supabase
    .from("organizations")
    .select("branding")
    .eq("id", organizationId)
    .single()

  if (fetchError) throw fetchError

  const current = (orgRow?.branding ?? {}) as OrganizationBranding
  const updates: OrganizationBranding = {
    ...current,
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null
  }

  if (input.bio !== undefined) {
    updates.bio = input.bio?.trim() || null
  }

  if (input.credentials !== undefined) {
    const list = (input.credentials ?? []).filter((c) => c.text.trim().length > 0)
    updates.credentials = list.length > 0 ? list : null
  }

  if (input.logo_url !== undefined) {
    updates.logo_url = input.logo_url?.trim() || null
  }

  if (input.primary_color !== undefined) {
    const trimmed = input.primary_color?.trim() || ""
    updates.primary_color = trimmed || null
  }

  if (input.secondary_color !== undefined) {
    const trimmed = input.secondary_color?.trim() || ""
    updates.secondary_color = trimmed || null
  }

  if (input.tagline !== undefined) {
    updates.tagline = input.tagline?.trim() || null
  }

  if (input.cta_text !== undefined) {
    updates.cta_text = input.cta_text?.trim() || null
  }

  if (input.offers_section_title !== undefined) {
    updates.offers_section_title = input.offers_section_title?.trim() || null
  }

  if (input.footer_cta_text !== undefined) {
    updates.footer_cta_text = input.footer_cta_text?.trim() || null
  }

  if (input.hero_image_url !== undefined) {
    updates.hero_image_url = input.hero_image_url?.trim() || null
  }

  if (input.stats !== undefined) {
    updates.stats = input.stats ?? null
  }

  if (input.testimonials !== undefined) {
    updates.testimonials = input.testimonials ?? null
  }

  if (input.faq !== undefined) {
    updates.faq = input.faq ?? null
  }

  if (input.offers_display !== undefined) {
    updates.offers_display = input.offers_display ?? null
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ branding: updates })
    .eq("id", organizationId)

  if (updateError) throw updateError

  return updates
}



