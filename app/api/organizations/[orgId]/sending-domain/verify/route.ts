import { createClient } from "@/lib/supabase/server"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badGateway,
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { getResendClient } from "@/lib/resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { attachResendCampaignTopic } from "@/lib/services/campaign-contacts"
import {
  fetchSendingDomain,
  parseResendDnsRecords,
  parseResendDomainStatus,
  updateSendingDomainFromResend,
} from "@/lib/services/sending-domains"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

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

  const { error: verifyError } = await resend.domains.verify(existing.resend_domain_id)
  if (verifyError) {
    return badGateway(verifyError.message)
  }

  const { data: remote, error: getError } = await resend.domains.get(existing.resend_domain_id)
  if (getError || !remote) {
    return badGateway(getError?.message ?? "Verification started, but status refresh failed")
  }

  try {
    const domain = await updateSendingDomainFromResend(supabase, organizationId, {
      status: parseResendDomainStatus(remote.status),
      dns_records: parseResendDnsRecords(remote.records),
    })
    try {
      const admin = createAdminClient()
      await attachResendCampaignTopic(admin, organizationId)
    } catch (topicError) {
      console.warn("attachResendCampaignTopic failed:", topicError)
    }
    return ok({ domain })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save verification status"
    return serverError(message)
  }
}
