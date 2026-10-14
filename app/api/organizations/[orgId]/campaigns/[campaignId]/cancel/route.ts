import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { cancelScheduledMarketingCampaign } from "@/lib/services/marketing-campaigns"

type RouteContext = {
  params: Promise<{ orgId: string; campaignId: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { orgId, campaignId } = await context.params
  const organizationId = Number(orgId)
  const id = Number(campaignId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }
  if (!Number.isFinite(id) || id <= 0) return badRequest("Invalid campaign id")

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
    const campaign = await cancelScheduledMarketingCampaign(
      supabase,
      organizationId,
      id
    )
    return ok({ campaign })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel campaign"
    return serverError(message)
  }
}
