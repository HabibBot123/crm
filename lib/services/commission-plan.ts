import type { SupabaseClient } from "@supabase/supabase-js"
import {
  normalizeOrgCommissionPlan,
  orgCommissionPlanSchema,
  resolveOrgCommissionPlan,
  type OrgCommissionPlan,
} from "@/lib/commissions/plan"

export async function fetchOrgCommissionPlan(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrgCommissionPlan> {
  const { data, error } = await supabase
    .from("organizations")
    .select("commission_plan")
    .eq("id", organizationId)
    .maybeSingle()
  if (error) throw error
  return resolveOrgCommissionPlan(data?.commission_plan ?? null)
}

export async function updateOrgCommissionPlan(
  supabase: SupabaseClient,
  organizationId: number,
  plan: OrgCommissionPlan
): Promise<OrgCommissionPlan> {
  const parsed = normalizeOrgCommissionPlan(orgCommissionPlanSchema.parse(plan))

  const { data, error } = await supabase.rpc("has_org_capability", {
    p_organization_id: organizationId,
    p_capability: "org.settings",
  })
  if (error) throw new Error("Failed to verify permissions.")
  if (data !== true) {
    throw new Error("You don't have permission to edit organization settings.")
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ commission_plan: parsed })
    .eq("id", organizationId)
  if (updateError) throw updateError

  return parsed
}
