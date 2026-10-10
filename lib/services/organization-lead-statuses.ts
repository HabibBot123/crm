import type { SupabaseClient } from "@supabase/supabase-js"
import {
  LEAD_STATUS_MAX_PER_ORG,
  SYSTEM_LEAD_STATUS_KEYS,
  createOrganizationLeadStatusSchema,
  leadStatusKeyFromLabel,
  leadStatusSchema,
  organizationLeadStatusSchema,
  updateOrganizationLeadStatusSchema,
  type CreateOrganizationLeadStatusInput,
  type OrganizationLeadStatus,
  type UpdateOrganizationLeadStatusInput,
} from "@/schemas/crm.schema"

function parseRows(rows: unknown[]): OrganizationLeadStatus[] {
  return rows.map((row) => organizationLeadStatusSchema.parse(row))
}

export async function fetchOrganizationLeadStatuses(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrganizationLeadStatus[]> {
  const { data, error } = await supabase
    .from("organization_lead_statuses")
    .select("*")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true })
    .order("id", { ascending: true })

  if (error) throw error
  return parseRows(data ?? [])
}

export async function createOrganizationLeadStatus(
  supabase: SupabaseClient,
  input: CreateOrganizationLeadStatusInput
): Promise<OrganizationLeadStatus> {
  const payload = createOrganizationLeadStatusSchema.parse(input)
  const key = leadStatusKeyFromLabel(payload.label)
  const parsedKey = leadStatusSchema.safeParse(key)
  if (!parsedKey.success) {
    throw new Error("Status name must start with a letter and use letters, numbers, or spaces.")
  }

  if (SYSTEM_LEAD_STATUS_KEYS.some((systemKey) => systemKey === key)) {
    throw new Error("This status name is reserved.")
  }

  const existing = await fetchOrganizationLeadStatuses(supabase, payload.organization_id)
  if (existing.length >= LEAD_STATUS_MAX_PER_ORG) {
    throw new Error(`You can define at most ${LEAD_STATUS_MAX_PER_ORG} statuses.`)
  }
  if (existing.some((status) => status.key === key)) {
    throw new Error("A status with this name already exists.")
  }

  const nextPosition =
    existing.length === 0 ? 0 : Math.max(...existing.map((status) => status.position)) + 1

  const { data, error } = await supabase
    .from("organization_lead_statuses")
    .insert({
      organization_id: payload.organization_id,
      key,
      label: payload.label.trim(),
      color: payload.color,
      position: nextPosition,
      is_system: false,
    })
    .select("*")
    .single()

  if (error) throw error
  return organizationLeadStatusSchema.parse(data)
}

export async function updateOrganizationLeadStatus(
  supabase: SupabaseClient,
  input: UpdateOrganizationLeadStatusInput
): Promise<void> {
  const payload = updateOrganizationLeadStatusSchema.parse(input)

  const { data: current, error: loadError } = await supabase
    .from("organization_lead_statuses")
    .select("*")
    .eq("id", payload.id)
    .single()
  if (loadError) throw loadError

  const currentStatus = organizationLeadStatusSchema.parse(current)
  const patch: Record<string, unknown> = {}

  if (payload.color !== undefined) {
    patch.color = payload.color
  }
  if (payload.position !== undefined) {
    patch.position = payload.position
  }
  if (payload.label !== undefined) {
    if (currentStatus.is_system) {
      throw new Error("System status labels cannot be changed.")
    }
    patch.label = payload.label.trim()
  }

  if (Object.keys(patch).length === 0) return

  const { error } = await supabase
    .from("organization_lead_statuses")
    .update(patch)
    .eq("id", payload.id)
  if (error) throw error
}

export async function deleteOrganizationLeadStatus(
  supabase: SupabaseClient,
  input: { organizationId: number; statusId: number }
): Promise<void> {
  const { data: current, error: loadError } = await supabase
    .from("organization_lead_statuses")
    .select("*")
    .eq("id", input.statusId)
    .eq("organization_id", input.organizationId)
    .single()
  if (loadError) throw loadError

  const status = organizationLeadStatusSchema.parse(current)
  if (status.is_system) {
    throw new Error("System statuses cannot be deleted.")
  }

  const { count: leadCount, error: leadError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("status", status.key)
  if (leadError) throw leadError
  if ((leadCount ?? 0) > 0) {
    throw new Error("This status is still used by leads and cannot be deleted.")
  }

  const { count: formCount, error: formError } = await supabase
    .from("crm_forms")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("initial_status", status.key)
  if (formError) throw formError
  if ((formCount ?? 0) > 0) {
    throw new Error("This status is still used by a form and cannot be deleted.")
  }

  const { error } = await supabase
    .from("organization_lead_statuses")
    .delete()
    .eq("id", input.statusId)
    .eq("organization_id", input.organizationId)
  if (error) throw error
}
