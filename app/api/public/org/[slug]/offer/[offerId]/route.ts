import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchOrganizationBySlug,
  type PublicOfferVariant,
  type PublicOfferWithOrgResponse,
} from "@/lib/services/organizations"
import { notFound, jsonResponse } from "@/lib/api-helpers/api-response"

const SLUG_MAX_LENGTH = 100
const PUBLIC_CACHE_SECONDS = 60

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; offerId: string }> }
) {
  const { slug, offerId: offerIdParam } = await context.params
  const normalizedSlug = slug?.trim().toLowerCase()
  if (
    !normalizedSlug ||
    normalizedSlug.length > SLUG_MAX_LENGTH ||
    !/^[a-z0-9-]+$/.test(normalizedSlug)
  ) {
    return notFound("Organization not found")
  }

  const offerId = Number(offerIdParam)
  if (!Number.isFinite(offerId) || offerId < 1) {
    return notFound("Offer not found")
  }

  const { searchParams } = new URL(request.url)
  const variantIdParam = searchParams.get("variantId")
  const variantId =
    variantIdParam != null && variantIdParam !== ""
      ? Number(variantIdParam)
      : null

  const supabase = createAdminClient()

  const organization = await fetchOrganizationBySlug(supabase, normalizedSlug)
  if (!organization) {
    return notFound("Organization not found")
  }

  const effectiveVariantId =
    variantId != null && Number.isFinite(variantId) && variantId > 0
      ? variantId
      : null

  const { data: offerRow, error: offerError } = await supabase
    .from("offers")
    .select(
      `
      id,
      title,
      description,
      price,
      currency,
      interval,
      billing_type,
      installment_count,
      key_features,
      offer_products(
        products(id, title, type, cover_image_url)
      )
      `
    )
    .eq("id", offerId)
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .maybeSingle()

  if (offerError || !offerRow) {
    return notFound("Offer not found")
  }

  let variant: PublicOfferVariant | null = null

  if (effectiveVariantId != null) {
    const { data: linkRow, error: linkError } = await supabase
      .from("offer_variants")
      .select("id, label, price, installment_count")
      .eq("id", effectiveVariantId)
      .eq("offer_id", offerId)
      .maybeSingle()

    if (!linkError && linkRow) {
      const effectivePrice =
        linkRow.price ?? (offerRow as { price: number }).price
      const effectiveInstallments =
        linkRow.installment_count ??
        (offerRow as { installment_count: number | null }).installment_count

      variant = {
        id: linkRow.id,
        label: linkRow.label,
        price: Number(effectivePrice),
        installment_count: effectiveInstallments,
      }
    }
  }

  const offer = offerRow as {
    id: number
    title: string
    description: string | null
    key_features: string[] | null
    offer_products: {
      products:
        | { id: number; title: string; type: string; cover_image_url: string | null }
        | { id: number; title: string; type: string; cover_image_url: string | null }[]
        | null
    }[]
    price: number
    currency: string
    interval: "month" | "year" | null
    billing_type: string
    installment_count: number | null
  }

  const effectivePrice = variant ? variant.price : Number(offer.price)
  const effectiveInstallmentCount = variant
    ? variant.installment_count
    : offer.installment_count

  const products =
    (offer.offer_products ?? [])
      .map((op) => (Array.isArray(op.products) ? op.products[0] : op.products))
      .filter(
        (p): p is { id: number; title: string; type: string; cover_image_url: string | null } =>
          p != null
      ) ?? []

  const data: PublicOfferWithOrgResponse = {
    organization,
    offer: {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      price: effectivePrice,
      currency: offer.currency,
      interval: offer.interval,
      billing_type: offer.billing_type as any,
      installment_count: effectiveInstallmentCount,
      variant,
      key_features: offer.key_features ?? null,
      products,
    },
  }

  if (!data) {
    return notFound("Offer not found")
  }

  const response = jsonResponse(200, data)
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}`
  )
  return response
}
