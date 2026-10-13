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
  deleteCampaignSegment,
  fetchCampaignSegment,
  updateCampaignSegment,
} from "@/lib/services/campaign-segments"
import { updateCampaignSegmentSchema } from "@/schemas/campaign-segment.schema"

type RouteContext = {
  params: Promise<{ orgId: string; segmentId: string }>
}

function parseIds(orgId: string, segmentId: string): {
  organizationId: number
  segmentId: number
} | null {
  const organizationId = Number(orgId)
  const id = Number(segmentId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) return null
  if (!Number.isFinite(id) || id <= 0) return null
  return { organizationId, segmentId: id }
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId, segmentId } = await context.params
  const ids = parseIds(orgId, segmentId)
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
    const segment = await fetchCampaignSegment(
      supabase,
      ids.organizationId,
      ids.segmentId
    )
    if (!segment) return notFound("Segment not found")
    return ok({ segment })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load segment"
    return serverError(message)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId, segmentId } = await context.params
  const ids = parseIds(orgId, segmentId)
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

  const parsed = updateCampaignSegmentSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const segment = await updateCampaignSegment(
      supabase,
      ids.organizationId,
      ids.segmentId,
      parsed.data
    )
    return ok({ segment })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update segment"
    return serverError(message)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId, segmentId } = await context.params
  const ids = parseIds(orgId, segmentId)
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
    await deleteCampaignSegment(supabase, ids.organizationId, ids.segmentId)
    return ok({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete segment"
    return serverError(message)
  }
}
