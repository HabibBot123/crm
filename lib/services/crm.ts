import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchTeamMembers } from "@/lib/services/team"
import {
  crmFieldSchema,
  createLeadSchema,
  leadSchema,
  leadStatusLogSchema,
  updateLeadStatusSchema,
  type CrmField,
  type CreateLeadInput,
  type Lead,
  type LeadStatus,
  type LeadStatusLog,
} from "@/schemas/crm.schema"

export type CrmLeadsFilters = {
  search?: string
  status?: LeadStatus[]
  origin?: ("form" | "manual")[]
  assignedSalesId?: number[]
}

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
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("v_crm_leads")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("status_at", { ascending: false })
    .range(from, to)

  const search = filters?.search?.trim()
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status)
  }
  if (filters?.origin && filters.origin.length > 0) {
    query = query.in("origin", filters.origin)
  }
  if (filters?.assignedSalesId && filters.assignedSalesId.length > 0) {
    query = query.in("assigned_sales_id", filters.assignedSalesId)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = data ?? []
  return {
    items: parseLeadRows(rows),
    total: count ?? 0,
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

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...payload,
      email: emailNormalized,
      is_duplicate: (existingCount ?? 0) > 0,
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

export async function updateLeadAssignment(
  supabase: SupabaseClient,
  input: { leadId: number; assignedSalesId: number | null }
): Promise<void> {
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from("leads")
    .update({ assigned_sales_id: input.assignedSalesId, updated_at: nowIso })
    .eq("id", input.leadId)
  if (error) throw error
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
    position?: number
  }
): Promise<CrmField> {
  const row = {
    organization_id: input.organizationId,
    key: input.key,
    label: input.label,
    client_question: input.clientQuestion,
    field_type: input.fieldType,
    options: input.options ?? null,
    is_required: input.isRequired ?? false,
    show_in_crm: input.showInCrm ?? true,
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
    position?: number
  }
): Promise<CrmField> {
  const patch: Record<string, unknown> = {}
  if (input.label !== undefined) patch.label = input.label
  if (input.clientQuestion !== undefined) patch.client_question = input.clientQuestion
  if (input.options !== undefined) patch.options = input.options
  if (input.isRequired !== undefined) patch.is_required = input.isRequired
  if (input.showInCrm !== undefined) patch.show_in_crm = input.showInCrm
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
