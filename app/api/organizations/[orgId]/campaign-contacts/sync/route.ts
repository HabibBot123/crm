import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import {
  fetchCampaignAudienceStats,
  syncOrgCampaignContactsToResend,
} from "@/lib/services/campaign-contacts"

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

  const access = await assertOrgCapability(supabase, organizationId, "campaigns.manage")
  if (!access.ok) return access.response

  try {
    const stats = await fetchCampaignAudienceStats(supabase, organizationId)
    return ok({ stats })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load audience stats"
    return serverError(message)
  }
}

/** Sync pending opted-in contacts to Resend (Marketing page Sync button). */
export async function POST(_request: Request, context: RouteContext) {
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

  const access = await assertOrgCapability(supabase, organizationId, "campaigns.manage")
  if (!access.ok) return access.response

  try {
    const admin = createAdminClient()
    const result = await syncOrgCampaignContactsToResend(admin, organizationId)
    const stats = await fetchCampaignAudienceStats(admin, organizationId)
    return ok({
      attempted: result.attempted,
      synced: result.synced,
      segments: result.segments,
      segment_added: result.segment_added,
      segment_removed: result.segment_removed,
      stats,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync campaign contacts"
    return serverError(message)
  }
}
