import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import {
  createCampaignEmailTemplate,
  fetchCampaignEmailTemplates,
} from "@/lib/services/campaign-email-templates"
import { createCampaignEmailTemplateSchema } from "@/schemas/campaign-email-template.schema"

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
    const templates = await fetchCampaignEmailTemplates(supabase, organizationId)
    return ok({ templates })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load templates"
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

  const parsed = createCampaignEmailTemplateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  try {
    const template = await createCampaignEmailTemplate(
      supabase,
      organizationId,
      parsed.data
    )
    return ok({ template })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create template"
    if (message.toLowerCase().includes("duplicate") || message.includes("23505")) {
      return badRequest("A template with this name already exists")
    }
    return serverError(message)
  }
}
