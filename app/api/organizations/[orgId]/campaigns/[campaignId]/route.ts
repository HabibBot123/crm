import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import {
  deleteMarketingCampaign,
  fetchMarketingCampaign,
  updateMarketingCampaign,
} from "@/lib/services/marketing-campaigns"
import { updateMarketingCampaignSchema } from "@/schemas/marketing-campaign.schema"

type RouteContext = {
  params: Promise<{ orgId: string; campaignId: string }>
}

function parseIds(orgId: string, campaignId: string): {
  organizationId: number
  campaignId: number
} | null {
  const organizationId = Number(orgId)
  const id = Number(campaignId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) return null
  if (!Number.isFinite(id) || id <= 0) return null
  return { organizationId, campaignId: id }
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId, campaignId } = await context.params
  const ids = parseIds(orgId, campaignId)
  if (!ids) return badRequest("Invalid id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(
    supabase,
    ids.organizationId,
    "campaigns.manage"
  )
  if (!access.ok) return access.response

  try {
    const campaign = await fetchMarketingCampaign(
      supabase,
      ids.organizationId,
      ids.campaignId
    )
    if (!campaign) return notFound("Campaign not found")
    return ok({ campaign })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load campaign"
    return serverError(message)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId, campaignId } = await context.params
  const ids = parseIds(orgId, campaignId)
  if (!ids) return badRequest("Invalid id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(
    supabase,
    ids.organizationId,
    "campaigns.manage"
  )
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = updateMarketingCampaignSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const campaign = await updateMarketingCampaign(
      supabase,
      ids.organizationId,
      ids.campaignId,
      parsed.data
    )
    return ok({ campaign })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update campaign"
    return serverError(message)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId, campaignId } = await context.params
  const ids = parseIds(orgId, campaignId)
  if (!ids) return badRequest("Invalid id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(
    supabase,
    ids.organizationId,
    "campaigns.manage"
  )
  if (!access.ok) return access.response

  try {
    await deleteMarketingCampaign(
      supabase,
      ids.organizationId,
      ids.campaignId
    )
    return ok({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete campaign"
    return serverError(message)
  }
}
