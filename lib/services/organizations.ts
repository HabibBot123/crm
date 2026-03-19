import type { SupabaseClient } from "@supabase/supabase-js"
import type { BillingType } from "./offers"
import { fetchOffersByOrganization } from "./offers"

export type OrganizationBranding = {
  logo_url?: string | null
  description?: string | null
  primary_color?: string | null
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
  stripe_payment_link: string | null
  billing_type: BillingType
}

export type PublicOrgResponse = {
  organization: OrganizationPublic
  offers: PublicOrgOffer[]
}

const DEFAULT_MAX_PUBLIC_OFFERS = 50

export async function getPublicOrganizationData(
  supabase: SupabaseClient,
  slug: string,
  maxOffers: number = DEFAULT_MAX_PUBLIC_OFFERS
): Promise<PublicOrgResponse | null> {
  const organization = await fetchOrganizationBySlug(supabase, slug)
  if (!organization) return null

  const allOffers = await fetchOffersByOrganization(supabase, organization.id)
  const offers: PublicOrgOffer[] = allOffers
    .filter((o) => o.status === "active")
    .slice(0, maxOffers)
    .map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      price: o.price,
      currency: o.currency,
      interval: o.interval,
      stripe_payment_link: o.stripe_payment_link,
      billing_type: o.billing_type,
    }))

  return {
    organization,
    offers,
  }
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
  description?: string | null
  primary_color?: string | null
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

  if (input.primary_color !== undefined) {
    const trimmed = input.primary_color?.trim() || ""
    updates.primary_color = trimmed || null
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ branding: updates })
    .eq("id", organizationId)

  if (updateError) throw updateError

  return updates
}



