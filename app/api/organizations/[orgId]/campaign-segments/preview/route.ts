import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { previewCampaignSegment } from "@/lib/services/campaign-segments"
import { campaignSegmentFilterGroupSchema } from "@/schemas/campaign-segment.schema"
import { z } from "zod"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

const previewBodySchema = z.object({
  filter_json: campaignSegmentFilterGroupSchema,
})

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

  const access = await assertOrgCapability(supabase, organizationId, "campaigns.manage")
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = previewBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const preview = await previewCampaignSegment(
      supabase,
      organizationId,
      parsed.data.filter_json
    )
    return ok({ preview })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to preview segment"
    return serverError(message)
  }
}
