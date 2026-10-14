import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { sendMarketingCampaign } from "@/lib/services/marketing-campaigns"
import { sendMarketingCampaignSchema } from "@/schemas/marketing-campaign.schema"

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

  let rawBody: unknown = {}
  try {
    const text = await request.text()
    if (text.trim()) rawBody = JSON.parse(text)
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = sendMarketingCampaignSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const admin = createAdminClient()
    const campaign = await sendMarketingCampaign(
      admin,
      organizationId,
      id,
      parsed.data
    )
    return ok({ campaign })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send campaign"
    return serverError(message)
  }
}
