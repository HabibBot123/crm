import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { sendTestMarketingCampaign } from "@/lib/services/marketing-campaigns"
import { testSendMarketingCampaignSchema } from "@/schemas/marketing-campaign.schema"

type RouteContext = {
  params: Promise<{ orgId: string; campaignId: string }>
}

export async function POST(request: Request, context: RouteContext) {
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

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = testSendMarketingCampaignSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    await sendTestMarketingCampaign(supabase, organizationId, id, parsed.data)
    return ok({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send test email"
    return serverError(message)
  }
}
