import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import {
  createMarketingCampaign,
  fetchMarketingCampaigns,
} from "@/lib/services/marketing-campaigns"
import { createMarketingCampaignSchema } from "@/schemas/marketing-campaign.schema"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = Number(orgId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(
    supabase,
    organizationId,
    "campaigns.manage"
  )
  if (!access.ok) return access.response

  try {
    const campaigns = await fetchMarketingCampaigns(supabase, organizationId)
    return ok({ campaigns })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load campaigns"
    return serverError(message)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = Number(orgId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(
    supabase,
    organizationId,
    "campaigns.manage"
  )
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = createMarketingCampaignSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const campaign = await createMarketingCampaign(
      supabase,
      organizationId,
      parsed.data
    )
    return ok({ campaign })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create campaign"
    return serverError(message)
  }
}
