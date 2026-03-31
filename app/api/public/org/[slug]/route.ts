import { createAdminClient } from "@/lib/supabase/admin"
import type { PublicOrgOffer } from "@/lib/services/organizations"
import type { BillingType } from "@/lib/services/offers"
import { notFound, jsonResponse } from "@/lib/api-helpers/api-response"

const SLUG_MAX_LENGTH = 100
const PUBLIC_CACHE_SECONDS = 60
const DEFAULT_MAX_PUBLIC_OFFERS = 50

type RawPublicOfferRow = {
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
  offer_products: {
    products:
      | {
          id: number
          title: string
          type: string
          cover_image_url: string | null
        }
      | {
          id: number
          title: string
          type: string
          cover_image_url: string | null
        }[]
      | null
  }[]
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const normalizedSlug = slug?.trim().toLowerCase()
  if (
    !normalizedSlug ||
    normalizedSlug.length > SLUG_MAX_LENGTH ||
    !/^[a-z0-9-]+$/.test(normalizedSlug)
  ) {
    return notFound("Organization not found")
  }

  const supabase = createAdminClient()
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, branding")
    .eq("slug", normalizedSlug)
    .is("deleted_at", null)
    .maybeSingle()

  if (orgError || !organization) {
    return notFound("Organization not found")
  }

  const { data: offerRows, error: offersError } = await supabase
    .from("offers")
    .select(
      `
      id,
      title,
      description,
      price,
      currency,
      interval,
      installment_count,
      stripe_payment_link,
      billing_type,
      key_features,
      offer_products(products(id, title, type, cover_image_url))
      `
    )
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(DEFAULT_MAX_PUBLIC_OFFERS)

  if (offersError) {
    return notFound("Organization not found")
  }

  const rows = (offerRows ?? []) as unknown as RawPublicOfferRow[]
  const rawOffers: PublicOrgOffer[] = rows.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    price: o.price,
    currency: o.currency,
    interval: o.interval,
    installment_count: o.installment_count ?? null,
    stripe_payment_link: o.stripe_payment_link,
    billing_type: o.billing_type,
    key_features: o.key_features ?? null,
    products: (o.offer_products ?? [])
      .map((op) => (Array.isArray(op.products) ? op.products[0] : op.products))
      .filter(
        (p): p is { id: number; title: string; type: string; cover_image_url: string | null } =>
          p != null
      ),
  }))

  const visibleIds: number[] = Array.isArray(organization.branding?.offers_display?.visible_offer_ids)
    ? organization.branding.offers_display.visible_offer_ids.filter(
        (id: unknown): id is number => typeof id === "number" && Number.isFinite(id)
      )
    : []
  const offers =
    visibleIds.length > 0
      ? visibleIds
          .map((id: number) => rawOffers.find((o) => o.id === id) ?? null)
          .filter((o): o is PublicOrgOffer => o != null)
      : rawOffers

  const data = {
    organization,
    offers,
  }

  const response = jsonResponse(200, data)
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}`
  )
  return response
}
