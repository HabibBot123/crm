import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchTeamMembers } from "@/lib/services/team"
import { z } from "zod"
import {
  CRM_FIELD_FILTERABLE_MAX,
  crmFieldSchema,
  crmLeadFieldFilterSchema,
  createLeadSchema,
  isCrmFieldFilterableType,
  leadSchema,
  leadStatusLogSchema,
  updateLeadStatusSchema,
  type CrmField,
  type CreateLeadInput,
  type Lead,
  type LeadStatus,
  type LeadStatusLog,
} from "@/schemas/crm.schema"

export type CrmLeadFieldFilter = z.infer<typeof crmLeadFieldFilterSchema>

export type CrmLeadsFilters = {
  search?: string
  status?: LeadStatus[]
  origin?: ("form" | "manual")[]
  /** Members linked to the lead (owner and/or attributions). */
  memberIds?: number[]
  businessUnitIds?: number[]
  fieldFilters?: CrmLeadFieldFilter[]
}

const crmLeadsPageRpcSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
})

export type CrmLeadsPage = {
  items: Lead[]
  total: number
}

export type LeadFieldValueInput = {
  fieldDefId: number
  value: string
}

export type LeadAttributionInput = {
  memberId: number
  attributionType: "closer" | "setter" | "ambassador" | "business_unit"
  commissionRate?: number | null
  commissionFixed?: number | null
}

export type SalesMemberOption = {
  memberId: number
  userId: string | null
  fullName: string | null
  role: string
  defaultCommissionRateSales: number | null
  defaultCommissionFixedSales: number | null
  defaultCommissionRateAmbassador: number | null
  defaultCommissionFixedAmbassador: number | null
  defaultCommissionRateCoach: number | null
  defaultCommissionFixedCoach: number | null
}

export type AttributionMemberOption = SalesMemberOption

export function memberDefaultsForAttributionType(
  member: Pick<
    SalesMemberOption,
    | "defaultCommissionRateSales"
    | "defaultCommissionFixedSales"
    | "defaultCommissionRateAmbassador"
    | "defaultCommissionFixedAmbassador"
  >,
  attributionType: "closer" | "setter" | "ambassador" | "business_unit"
): { rate: number | null; fixed: number | null } {
  if (attributionType === "ambassador") {
    return {
      rate: member.defaultCommissionRateAmbassador,
      fixed: member.defaultCommissionFixedAmbassador,
    }
  }
  return {
    rate: member.defaultCommissionRateSales,
    fixed: member.defaultCommissionFixedSales,
  }
}

function parseLeadRows(rows: unknown[]): Lead[] {
  return rows.map((row) => leadSchema.parse(row))
}

function parseFieldRows(rows: unknown[]): CrmField[] {
  return rows.map((row) => crmFieldSchema.parse(row))
}

function parseStatusRows(rows: unknown[]): LeadStatusLog[] {
  return rows.map((row) => leadStatusLogSchema.parse(row))
}

export async function fetchLeadsPage(
  supabase: SupabaseClient,
  params: {
    organizationId: number
    page: number
    pageSize: number
    filters?: CrmLeadsFilters
  }
): Promise<CrmLeadsPage> {
  const { organizationId, page, pageSize, filters } = params
  const fieldFilters = (filters?.fieldFilters ?? [])
    .map((item) => crmLeadFieldFilterSchema.parse(item))
    .filter((item) => item.values.length > 0)

  const { data, error } = await supabase.rpc("crm_leads_page", {
    p_organization_id: organizationId,
    p_page: page,
    p_page_size: pageSize,
    p_search: filters?.search?.trim() || null,
    p_statuses: filters?.status && filters.status.length > 0 ? filters.status : null,
    p_origins: filters?.origin && filters.origin.length > 0 ? filters.origin : null,
    p_member_ids:
      filters?.memberIds && filters.memberIds.length > 0 ? filters.memberIds : null,
    p_business_unit_ids:
      filters?.businessUnitIds && filters.businessUnitIds.length > 0
        ? filters.businessUnitIds
        : null,
    p_field_filters: fieldFilters.map((item) => ({
      field_def_id: item.fieldDefId,
      values: item.values,
    })),
  })

  if (error) throw error

  const parsed = crmLeadsPageRpcSchema.parse(data ?? { items: [], total: 0 })
  return {
    items: parseLeadRows(parsed.items),
    total: parsed.total,
  }
}

export async function fetchLeadDetail(
  supabase: SupabaseClient,
  leadId: number
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("v_crm_leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return leadSchema.parse(data)
}

export async function fetchLeadStatusHistory(
  supabase: SupabaseClient,
  leadId: number
): Promise<LeadStatusLog[]> {
  const { data, error } = await supabase
    .from("lead_status")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return parseStatusRows(data ?? [])
}

export async function createLead(
  supabase: SupabaseClient,
  input: CreateLeadInput
): Promise<Lead> {
  const payload = createLeadSchema.parse(input)
  const emailNormalized = payload.email.trim().toLowerCase()

  const { count: existingCount, error: dupError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", payload.organization_id)
    .ilike("email", emailNormalized)
  if (dupError) throw dupError

  const lastName = payload.last_name?.trim() || null

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: payload.organization_id,
      first_name: payload.first_name.trim(),
      last_name: lastName,
      email: emailNormalized,
      phone: payload.phone ?? null,
      origin: payload.origin,
      created_by_member_id: payload.created_by_member_id,
      owner_id: payload.owner_id ?? null,
      target_offer_id: payload.target_offer_id ?? null,
      is_duplicate: (existingCount ?? 0) > 0,
      marketing_opt_in: true,
    })
    .select("id")
    .single()

  if (error) throw error

  const leadId = Number(data.id)

  const lead = await fetchLeadDetail(supabase, leadId)
  if (!lead) {
    throw new Error("Lead was created but could not be loaded")
  }
  return lead
}

export async function updateLeadStatus(
  supabase: SupabaseClient,
  input: {
    leadId: number
    toStatus: LeadStatus
    changedByMemberId: number | null
    note?: string | null
  }
): Promise<void> {
  const validated = updateLeadStatusSchema.parse({
    lead_id: input.leadId,
    to_status: input.toStatus,
    changed_by_member_id: input.changedByMemberId,
    note: input.note ?? null,
  })

  const { data: leadRow, error: leadLoadError } = await supabase
    .from("leads")
    .select("status")
    .eq("id", validated.lead_id)
    .single()
  if (leadLoadError) throw leadLoadError

  const fromStatus = String(leadRow.status)
  const nowIso = new Date().toISOString()

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: validated.to_status, status_at: nowIso, updated_at: nowIso })
    .eq("id", validated.lead_id)
  if (updateError) throw updateError

  const { error: statusError } = await supabase.from("lead_status").insert({
    lead_id: validated.lead_id,
    from_status: fromStatus,
    to_status: validated.to_status,
    changed_by_member_id: validated.changed_by_member_id,
    note: validated.note ?? null,
  })
  if (statusError) throw statusError
}

function assertLeadOwnersEditable(lead: {
  commissions_activated_at: string | null
}): void {
  if (lead.commissions_activated_at != null) {
    throw new Error("Owner and business unit cannot be changed after commissions are activated.")
  }
}

export async function updateLeadOwner(
  supabase: SupabaseClient,
  input: { leadId: number; ownerId: number | null }
): Promise<{ previousOwnerId: number | null }> {
  const { data: existing, error: loadError } = await supabase
    .from("leads")
    .select("owner_id, commissions_activated_at")
    .eq("id", input.leadId)
    .single()
  if (loadError) throw loadError

  assertLeadOwnersEditable({
    commissions_activated_at:
      typeof existing.commissions_activated_at === "string"
        ? existing.commissions_activated_at
        : null,
  })

  const previousOwnerId =
    typeof existing.owner_id === "number" && Number.isFinite(existing.owner_id)
      ? existing.owner_id
      : null

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from("leads")
    .update({ owner_id: input.ownerId, updated_at: nowIso })
    .eq("id", input.leadId)
  if (error) throw error

  return { previousOwnerId }
}

export async function updateLeadBusinessUnit(
  supabase: SupabaseClient,
  input: { leadId: number; businessUnitId: number | null }
): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from("leads")
    .select("commissions_activated_at")
    .eq("id", input.leadId)
    .single()
  if (loadError) throw loadError

  assertLeadOwnersEditable({
    commissions_activated_at:
      typeof existing.commissions_activated_at === "string"
        ? existing.commissions_activated_at
        : null,
  })

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from("leads")
    .update({ business_unit_id: input.businessUnitId, updated_at: nowIso })
    .eq("id", input.leadId)
  if (error) throw error
}

/** Client helper: assign business unit via API. */
export async function assignLeadBusinessUnit(input: {
  organizationId: number
  leadId: number
  businessUnitId: number | null
}): Promise<void> {
  const res = await fetch(
    `/api/organizations/${input.organizationId}/leads/${input.leadId}/assign-business-unit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_unit_id: input.businessUnitId }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof body.error === "string"
        ? body.error
        : "Could not assign business unit"
    throw new Error(message)
  }
}

/** Client helper: assign owner via API (updates + notifies by email when set). */
export async function assignLeadOwner(input: {
  organizationId: number
  leadId: number
  ownerId: number | null
}): Promise<void> {
  const res = await fetch(
    `/api/organizations/${input.organizationId}/leads/${input.leadId}/assign-owner`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: input.ownerId }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof body.error === "string" ? body.error : "Could not assign owner"
    throw new Error(message)
  }
}

export async function updateLeadFields(
  supabase: SupabaseClient,
  input: { leadId: number; values: LeadFieldValueInput[] }
): Promise<void> {
  if (input.values.length === 0) return
  const rows = input.values.map((entry) => ({
    lead_id: input.leadId,
    field_def_id: entry.fieldDefId,
    value: entry.value,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from("lead_field_values")
    .upsert(rows, { onConflict: "lead_id,field_def_id" })
  if (error) throw error
}

export async function createLeadAttribution(
  supabase: SupabaseClient,
  input: { leadId: number; attribution: LeadAttributionInput }
): Promise<void> {
  const row = {
    lead_id: input.leadId,
    member_id: input.attribution.memberId,
    attribution_type: input.attribution.attributionType,
    commission_rate: input.attribution.commissionRate ?? null,
    commission_fixed: input.attribution.commissionFixed ?? null,
  }

  const { error } = await supabase
    .from("lead_attributions")
    .upsert(row, { onConflict: "lead_id,member_id,attribution_type" })

  if (error) throw error
}

export async function updateLeadAttribution(
  supabase: SupabaseClient,
  input: {
    leadId: number
    previousMemberId: number
    previousAttributionType: LeadAttributionInput["attributionType"]
    attribution: LeadAttributionInput
  }
): Promise<void> {
  const keyChanged =
    input.previousMemberId !== input.attribution.memberId ||
    input.previousAttributionType !== input.attribution.attributionType

  if (keyChanged) {
    const { error: deleteError } = await supabase
      .from("lead_attributions")
      .delete()
      .eq("lead_id", input.leadId)
      .eq("member_id", input.previousMemberId)
      .eq("attribution_type", input.previousAttributionType)
    if (deleteError) throw deleteError
  }

  const { error } = await supabase.from("lead_attributions").upsert(
    {
      lead_id: input.leadId,
      member_id: input.attribution.memberId,
      attribution_type: input.attribution.attributionType,
      commission_rate: input.attribution.commissionRate ?? null,
      commission_fixed: input.attribution.commissionFixed ?? null,
    },
    { onConflict: "lead_id,member_id,attribution_type" }
  )
  if (error) throw error
}

export async function deleteLeadAttribution(
  supabase: SupabaseClient,
  input: {
    leadId: number
    memberId: number
    attributionType: LeadAttributionInput["attributionType"]
  }
): Promise<void> {
  const { error } = await supabase
    .from("lead_attributions")
    .delete()
    .eq("lead_id", input.leadId)
    .eq("member_id", input.memberId)
    .eq("attribution_type", input.attributionType)
  if (error) throw error
}

export async function fetchCrmFields(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CrmField[]> {
  const { data, error } = await supabase
    .from("crm_fields")
    .select("*")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true })
    .order("id", { ascending: true })

  if (error) throw error
  return parseFieldRows(data ?? [])
}

export async function createCrmField(
  supabase: SupabaseClient,
  input: {
    organizationId: number
    key: string
    label: string
    clientQuestion: string
    fieldType: CrmField["field_type"]
    options?: { value: string; label: string }[] | null
    isRequired?: boolean
    showInCrm?: boolean
    filterable?: boolean
    position?: number
  }
): Promise<CrmField> {
  const filterable = input.filterable ?? false
  if (filterable && !isCrmFieldFilterableType(input.fieldType)) {
    throw new Error("Only select, multi_select, and boolean fields can be filterable.")
  }
  if (filterable) {
    const existing = await fetchCrmFields(supabase, input.organizationId)
    const filterableCount = existing.filter((field) => field.filterable).length
    if (filterableCount >= CRM_FIELD_FILTERABLE_MAX) {
      throw new Error(
        `At most ${CRM_FIELD_FILTERABLE_MAX} filterable fields are allowed.`
      )
    }
  }

  const row = {
    organization_id: input.organizationId,
    key: input.key,
    label: input.label,
    client_question: input.clientQuestion,
    field_type: input.fieldType,
    options: input.options ?? null,
    is_required: input.isRequired ?? false,
    show_in_crm: input.showInCrm ?? true,
    filterable,
    position: input.position ?? 0,
  }
  const { data, error } = await supabase
    .from("crm_fields")
    .insert(row)
    .select("*")
    .single()
  if (error) throw error
  return crmFieldSchema.parse(data)
}

export async function updateCrmField(
  supabase: SupabaseClient,
  input: {
    fieldId: number
    label?: string
    clientQuestion?: string
    options?: { value: string; label: string }[] | null
    isRequired?: boolean
    showInCrm?: boolean
    filterable?: boolean
    position?: number
  }
): Promise<CrmField> {
  const { data: currentRow, error: loadError } = await supabase
    .from("crm_fields")
    .select("*")
    .eq("id", input.fieldId)
    .single()
  if (loadError) throw loadError
  const current = crmFieldSchema.parse(currentRow)

  if (input.filterable === true) {
    if (!isCrmFieldFilterableType(current.field_type)) {
      throw new Error("Only select, multi_select, and boolean fields can be filterable.")
    }
    if (!current.filterable) {
      const existing = await fetchCrmFields(supabase, current.organization_id)
      const filterableCount = existing.filter((field) => field.filterable).length
      if (filterableCount >= CRM_FIELD_FILTERABLE_MAX) {
        throw new Error(
          `At most ${CRM_FIELD_FILTERABLE_MAX} filterable fields are allowed.`
        )
      }
    }
  }

  const patch: Record<string, unknown> = {}
  if (input.label !== undefined) patch.label = input.label
  if (input.clientQuestion !== undefined) patch.client_question = input.clientQuestion
  if (input.options !== undefined) patch.options = input.options
  if (input.isRequired !== undefined) patch.is_required = input.isRequired
  if (input.showInCrm !== undefined) patch.show_in_crm = input.showInCrm
  if (input.filterable !== undefined) patch.filterable = input.filterable
  if (input.position !== undefined) patch.position = input.position

  const { data, error } = await supabase
    .from("crm_fields")
    .update(patch)
    .eq("id", input.fieldId)
    .select("*")
    .single()
  if (error) throw error
  return crmFieldSchema.parse(data)
}

export async function deleteCrmField(
  supabase: SupabaseClient,
  fieldId: number
): Promise<void> {
  const { data: usageRows, error: usageError } = await supabase
    .from("lead_field_values")
    .select("id")
    .eq("field_def_id", fieldId)
    .limit(1)
  if (usageError) throw usageError
  if ((usageRows ?? []).length > 0) {
    throw new Error("Cannot delete field already used on leads")
  }

  const { error } = await supabase.from("crm_fields").delete().eq("id", fieldId)
  if (error) throw error
}


function mapTeamMemberToOption(m: {
  id: number
  user_id: string | null
  full_name: string | null
  role: string
  default_commission_rate_sales: number | null
  default_commission_fixed_sales: number | null
  default_commission_rate_ambassador: number | null
  default_commission_fixed_ambassador: number | null
  default_commission_rate_coach: number | null
  default_commission_fixed_coach: number | null
}): SalesMemberOption {
  return {
    memberId: m.id,
    userId: m.user_id,
    fullName: m.full_name,
    role: m.role,
    defaultCommissionRateSales: m.default_commission_rate_sales,
    defaultCommissionFixedSales: m.default_commission_fixed_sales,
    defaultCommissionRateAmbassador: m.default_commission_rate_ambassador,
    defaultCommissionFixedAmbassador: m.default_commission_fixed_ambassador,
    defaultCommissionRateCoach: m.default_commission_rate_coach,
    defaultCommissionFixedCoach: m.default_commission_fixed_coach,
  }
}

export async function fetchSalesMembers(organizationId: number): Promise<SalesMemberOption[]> {
  const { items } = await fetchTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
    roles: ["sales", "owner", "admin"],
    status: "active",
  })
  const mapped = items.map(mapTeamMemberToOption)
  mapped.sort((a, b) => a.memberId - b.memberId)
  return mapped
}

/** Active members eligible for lead attributions (sales, ambassador, admin, owner, member). */
export async function fetchAttributionMembers(
  organizationId: number
): Promise<AttributionMemberOption[]> {
  const { items } = await fetchTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
    status: "active",
  })
  const mapped = items.map(mapTeamMemberToOption)
  mapped.sort((a, b) => a.memberId - b.memberId)
  return mapped
}
