import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badGateway,
  badRequest,
  conflict,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { getResendClient } from "@/lib/resend"
import { attachResendCampaignTopic } from "@/lib/services/campaign-contacts"
import {
  deleteSendingDomain,
  fetchSendingDomain,
  insertSendingDomain,
  normalizeDomainName,
  parseResendDnsRecords,
  parseResendDomainStatus,
  updateSendingDomainFromResend,
} from "@/lib/services/sending-domains"
import {
  createSendingDomainInputSchema,
  sendingDomainRegionSchema,
} from "@/schemas/sending-domain.schema"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function parseOrgId(raw: string): number | null {
  const organizationId = Number(raw)
  if (!Number.isFinite(organizationId) || organizationId <= 0) return null
  return organizationId
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = parseOrgId(orgId)
  if (organizationId == null) return badRequest("Invalid organization id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  try {
    const domain = await fetchSendingDomain(supabase, organizationId)
    return ok({ domain })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sending domain"
    return serverError(message)
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = parseOrgId(orgId)
  if (organizationId == null) return badRequest("Invalid organization id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(supabase, organizationId, "org.settings")
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = createSendingDomainInputSchema.safeParse({
    ...(typeof rawBody === "object" && rawBody !== null ? rawBody : {}),
    domain_name:
      typeof rawBody === "object" &&
      rawBody !== null &&
      "domain_name" in rawBody &&
      typeof rawBody.domain_name === "string"
        ? normalizeDomainName(rawBody.domain_name)
        : undefined,
  })
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  const existing = await fetchSendingDomain(supabase, organizationId)
  if (existing) {
    return conflict("This organization already has a sending domain")
  }

  const resend = getResendClient()
  if (!resend) {
    return serverError("Email provider is not configured")
  }

  const region = sendingDomainRegionSchema.parse(parsed.data.region)
  const { data: created, error: resendError } = await resend.domains.create({
    name: parsed.data.domain_name,
    region,
    customReturnPath: "bounce",
    openTracking: false,
    clickTracking: false,
  })

  if (resendError || !created) {
    return badGateway(resendError?.message ?? "Failed to create sending domain")
  }

  try {
    const domain = await insertSendingDomain(supabase, {
      organization_id: organizationId,
      domain_name: created.name,
      resend_domain_id: created.id,
      status: parseResendDomainStatus(created.status),
      region: sendingDomainRegionSchema.parse(created.region),
      dns_records: parseResendDnsRecords(created.records),
    })
    try {
      await attachResendCampaignTopic(supabase, organizationId)
    } catch (topicError) {
      console.warn("attachResendCampaignTopic failed:", topicError)
    }
    return ok({ domain })
  } catch (error) {
    await resend.domains.remove(created.id)
    const message = error instanceof Error ? error.message : "Failed to save sending domain"
    if (message.toLowerCase().includes("duplicate") || message.includes("23505")) {
      return conflict("This domain is already registered")
    }
    return serverError(message)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = parseOrgId(orgId)
  if (organizationId == null) return badRequest("Invalid organization id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(supabase, organizationId, "org.settings")
  if (!access.ok) return access.response

  const existing = await fetchSendingDomain(supabase, organizationId)
  if (!existing) {
    return ok({ domain: null })
  }

  const resend = getResendClient()
  if (!resend) {
    return serverError("Email provider is not configured")
  }

  const { error: resendError } = await resend.domains.remove(existing.resend_domain_id)
  if (resendError && resendError.name !== "not_found") {
    return badGateway(resendError.message)
  }

  try {
    await deleteSendingDomain(supabase, organizationId)
    return ok({ domain: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove sending domain"
    return serverError(message)
  }
}

export async function PATCH(_request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = parseOrgId(orgId)
  if (organizationId == null) return badRequest("Invalid organization id")

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized("Unauthorized")

  const access = await assertOrgCapability(supabase, organizationId, "org.settings")
  if (!access.ok) return access.response

  const existing = await fetchSendingDomain(supabase, organizationId)
  if (!existing) {
    return badRequest("No sending domain configured")
  }

  const resend = getResendClient()
  if (!resend) {
    return serverError("Email provider is not configured")
  }

  const { data: remote, error: resendError } = await resend.domains.get(existing.resend_domain_id)
  if (resendError || !remote) {
    return badGateway(resendError?.message ?? "Failed to refresh domain status")
  }

  try {
    const domain = await updateSendingDomainFromResend(supabase, organizationId, {
      status: parseResendDomainStatus(remote.status),
      dns_records: parseResendDnsRecords(remote.records),
    })
    return ok({ domain })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update sending domain"
    return serverError(message)
  }
}
