import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { fetchCampaignRecipientSentEmail } from "@/lib/services/campaign-delivery"

type RouteContext = {
  params: Promise<{
    orgId: string
    campaignId: string
    recipientId: string
  }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId, campaignId, recipientId } = await context.params
  const organizationId = Number(orgId)
  const campaign = Number(campaignId)
  const recipient = Number(recipientId)

  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }
  if (!Number.isFinite(campaign) || campaign <= 0) {
    return badRequest("Invalid campaign id")
  }
  if (!Number.isFinite(recipient) || recipient <= 0) {
    return badRequest("Invalid recipient id")
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
    const email = await fetchCampaignRecipientSentEmail(
      supabase,
      organizationId,
      campaign,
      recipient
    )
    return ok({ email })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load sent email from provider"
    return serverError(message)
  }
}
