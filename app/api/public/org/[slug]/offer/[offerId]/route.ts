import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicOfferWithOrganization } from "@/lib/services/organizations"
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
  const data = await getPublicOfferWithOrganization(
    supabase,
    normalizedSlug,
    offerId,
    variantId != null && Number.isFinite(variantId) ? variantId : null
  )

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
