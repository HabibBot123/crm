import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  unauthorized,
  serverError,
  forbidden,
} from "@/lib/api-helpers/api-response"
import { assignLeadBusinessUnitSchema } from "@/schemas/crm.schema"
import { updateLeadBusinessUnit } from "@/lib/services/crm"

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

  const access = await assertOrgCapability(supabase, organizationId, "crm.leads.edit")
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = assignLeadBusinessUnitSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  const businessUnitId = parsed.data.business_unit_id

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, organization_id, business_unit_id, owner_id, created_by_member_id, ambassador_link_id, status, commissions_activated_at"
    )
    .eq("id", leadIdNum)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (leadError) return serverError(leadError.message)
  if (!leadRow) return forbidden("Lead not found or not visible")

  if (businessUnitId != null) {
    const { data: buRow, error: buError } = await supabase
      .from("business_units")
      .select("id")
      .eq("id", businessUnitId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle()
    if (buError) return serverError(buError.message)
    if (!buRow) return badRequest("Business unit must be an active unit in this organization")
  }

  try {
    // Admin write: BU owners may set null / leave their scope; authz already checked.
    const admin = createAdminClient()
    await updateLeadBusinessUnit(admin, {
      leadId: leadIdNum,
      businessUnitId,
    })
    return ok({ business_unit_id: businessUnitId })
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Could not assign business unit"
    )
  }
}
