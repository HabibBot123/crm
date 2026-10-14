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
  deleteCampaignEmailTemplate,
  fetchCampaignEmailTemplate,
  updateCampaignEmailTemplate,
} from "@/lib/services/campaign-email-templates"
import { updateCampaignEmailTemplateSchema } from "@/schemas/campaign-email-template.schema"

type RouteContext = {
  params: Promise<{ orgId: string; templateId: string }>
}

function parseIds(orgId: string, templateId: string): {
  organizationId: number
  templateId: number
} | null {
  const organizationId = Number(orgId)
  const id = Number(templateId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) return null
  if (!Number.isFinite(id) || id <= 0) return null
  return { organizationId, templateId: id }
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId, templateId } = await context.params
  const ids = parseIds(orgId, templateId)
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
    const template = await fetchCampaignEmailTemplate(
      supabase,
      ids.organizationId,
      ids.templateId
    )
    if (!template) return notFound("Template not found")
    return ok({ template })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load template"
    return serverError(message)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId, templateId } = await context.params
  const ids = parseIds(orgId, templateId)
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

  const parsed = updateCampaignEmailTemplateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const template = await updateCampaignEmailTemplate(
      supabase,
      ids.organizationId,
      ids.templateId,
      parsed.data
    )
    return ok({ template })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update template"
    return serverError(message)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId, templateId } = await context.params
  const ids = parseIds(orgId, templateId)
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
    await deleteCampaignEmailTemplate(
      supabase,
      ids.organizationId,
      ids.templateId
    )
    return ok({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete template"
    return serverError(message)
  }
}
