import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicOrganizationData } from "@/lib/services/organizations"
import { notFound, jsonResponse } from "@/lib/api-helpers/api-response"

const SLUG_MAX_LENGTH = 100
const PUBLIC_CACHE_SECONDS = 60

export async function GET(
  request: Request,
  context: { params: { slug: string } }
) {
  const { slug } = context.params
  const normalizedSlug = slug?.trim().toLowerCase()
  if (
    !normalizedSlug ||
    normalizedSlug.length > SLUG_MAX_LENGTH ||
    !/^[a-z0-9-]+$/.test(normalizedSlug)
  ) {
    return notFound("Organization not found")
  }

  const supabase = createAdminClient()
  const data = await getPublicOrganizationData(supabase, normalizedSlug)
  if (!data) {
    return notFound("Organization not found")
  }

  const response = jsonResponse(200, data)
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}`
  )
  return response
}
