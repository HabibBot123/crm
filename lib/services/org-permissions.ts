import type { SupabaseClient } from "@supabase/supabase-js"
import {
  emptyCapabilityAccess,
  ownerCapabilityAccess,
  parseOrgCapability,
  type CapabilityAccess,
  type OrgCapability,
  type PermissionScope,
  resolvePermissionScope,
} from "@/lib/permissions/capabilities"

export type MatrixRole = "admin" | "sales" | "ambassador" | "coach" | "member" | "bu_owner"

export type OrgRolePermissionRow = {
  role: MatrixRole
  capability: OrgCapability
  allowed: boolean
}

export type MemberCapabilityContext = {
  access: CapabilityAccess
  scope: PermissionScope
  /** Active BUs owned by the current member (for scope=`bu` list filters). */
  ownedBusinessUnitIds: number[]
}

function parseMatrixRole(value: string): MatrixRole | null {
  if (
    value === "admin" ||
    value === "sales" ||
    value === "ambassador" ||
    value === "coach" ||
    value === "member" ||
    value === "bu_owner"
  ) {
    return value
  }
  return null
}

function collectAllowedCaps(
  rows: { capability: string; allowed: boolean }[] | null
): Set<OrgCapability> {
  const set = new Set<OrgCapability>()
  for (const row of rows ?? []) {
    if (!row.allowed) continue
    const cap = parseOrgCapability(row.capability)
    if (cap) set.add(cap)
  }
  return set
}

/**
 * Load matrix + BU-owner flag for the current member (UX).
 * Owner short-circuits to allowAll (no matrix read required).
 */
export async function fetchMemberCapabilityContext(
  supabase: SupabaseClient,
  args: {
    organizationId: number
    memberRole: string | null
    memberId: number | null
  }
): Promise<MemberCapabilityContext> {
  const role = args.memberRole

  if (role === "owner") {
    return {
      access: ownerCapabilityAccess(),
      scope: "org",
      ownedBusinessUnitIds: [],
    }
  }

  const roleMatrixPromise =
    role == null
      ? Promise.resolve({ data: [] as { capability: string; allowed: boolean }[], error: null })
      : supabase
          .from("organization_role_permissions")
          .select("capability, allowed")
          .eq("organization_id", args.organizationId)
          .eq("role", role)
          .eq("allowed", true)

  const buOwnerMatrixPromise = supabase
    .from("organization_role_permissions")
    .select("capability, allowed")
    .eq("organization_id", args.organizationId)
    .eq("role", "bu_owner")
    .eq("allowed", true)

  const buPromise =
    args.memberId == null
      ? Promise.resolve({ data: [] as { id: number }[], error: null })
      : supabase
          .from("business_units")
          .select("id")
          .eq("organization_id", args.organizationId)
          .eq("owner_member_id", args.memberId)
          .eq("status", "active")

  const [roleMatrixResult, buOwnerMatrixResult, buResult] = await Promise.all([
    roleMatrixPromise,
    buOwnerMatrixPromise,
    buPromise,
  ])

  if (roleMatrixResult.error) throw roleMatrixResult.error
  if (buOwnerMatrixResult.error) throw buOwnerMatrixResult.error
  if (buResult.error) throw buResult.error

  const ownedBusinessUnitIds = (buResult.data ?? [])
    .map((row) => row.id)
    .filter((id): id is number => typeof id === "number")
  const isBuOwner = ownedBusinessUnitIds.length > 0
  const access: CapabilityAccess = {
    allowAll: false,
    matrixAllowed: collectAllowedCaps(roleMatrixResult.data),
    buOwnerAllowed: collectAllowedCaps(buOwnerMatrixResult.data),
    isBuOwner,
  }

  return {
    access,
    scope: resolvePermissionScope({ memberRole: role, isBuOwner }),
    ownedBusinessUnitIds,
  }
}

/** Full matrix for Settings (owner), including `bu_owner` column. */
export async function fetchOrganizationRolePermissions(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrgRolePermissionRow[]> {
  const { data, error } = await supabase
    .from("organization_role_permissions")
    .select("role, capability, allowed")
    .eq("organization_id", organizationId)
    .order("role", { ascending: true })
    .order("capability", { ascending: true })

  if (error) throw error

  const rows: OrgRolePermissionRow[] = []
  for (const row of data ?? []) {
    const cap = parseOrgCapability(row.capability)
    const matrixRole = parseMatrixRole(row.role)
    if (!cap || !matrixRole) continue
    rows.push({
      role: matrixRole,
      capability: cap,
      allowed: Boolean(row.allowed),
    })
  }
  return rows
}

export function fallbackMemberCapabilityContext(): MemberCapabilityContext {
  return {
    access: emptyCapabilityAccess(),
    scope: "own",
    ownedBusinessUnitIds: [],
  }
}

export async function updateOrganizationRolePermission(
  supabase: SupabaseClient,
  args: {
    organizationId: number
    role: MatrixRole
    capability: OrgCapability
    allowed: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from("organization_role_permissions")
    .update({ allowed: args.allowed })
    .eq("organization_id", args.organizationId)
    .eq("role", args.role)
    .eq("capability", args.capability)

  if (error) throw error
}
