import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { recordLeadSale } from "@/lib/services/lead-sales"
import { recordLeadSaleSchema } from "@/schemas/crm.schema"

type RouteContext = {
  params: Promise<{ orgId: string; leadId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId, leadId } = await context.params
  const organizationId = Number(orgId)
  const leadIdNum = Number(leadId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }
  if (!Number.isFinite(leadIdNum) || leadIdNum <= 0) {
    return badRequest("Invalid lead id")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = recordLeadSaleSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  if (parsed.data.mode === "create") {
    const access = await assertOrgCapability(
      supabase,
      organizationId,
      "clients.enroll_manual"
    )
    if (!access.ok) return access.response
  } else {
    // link | sale_only
    const activate = await assertOrgCapability(
      supabase,
      organizationId,
      "crm.activate_commissions"
    )
    if (!activate.ok) {
      const enroll = await assertOrgCapability(
        supabase,
        organizationId,
        "clients.enroll_manual"
      )
      if (!enroll.ok) return enroll.response
    }
  }

  const admin = createAdminClient()

  try {
    const result = await recordLeadSale(admin, {
      organizationId,
      leadId: leadIdNum,
      input: parsed.data,
    })
    return ok(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record sale"
    return badRequest(message)
  }
}
