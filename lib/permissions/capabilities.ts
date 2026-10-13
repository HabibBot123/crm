/** Capability keys stored in organization_role_permissions (docs/04). */
export const ORG_CAPABILITIES = [
  "team.invite",
  "team.manage_roles",
  "team.revoke",
  "catalog.manage",
  "clients.view",
  "clients.enroll_manual",
  "sales.view",
  "analytics.view",
  "crm.leads.view",
  "crm.leads.view_own",
  "crm.leads.update_status",
  "crm.leads.edit",
  "crm.leads.delete",
  "crm.assign_sales",
  "crm.manage_attributions",
  "crm.activate_commissions",
  "crm.view_lead_commissions",
  "forms.view",
  "forms.manage",
  "forms.links.view_own",
  "forms.links.create_own",
  "forms.links.delete_own",
  "forms.links.manage_others",
  "coaching.view",
  "coaching.assign",
  "coaching.sessions.create",
  "coaching.sessions.complete",
  "commissions.view_own",
  "commissions.view_all",
  "commissions.mark_paid",
  "bu.manage",
  "org.settings",
  "campaigns.manage",
] as const

export type OrgCapability = (typeof ORG_CAPABILITIES)[number]

export type PermissionScope = "org" | "bu" | "own"

const CAPABILITY_SET: ReadonlySet<string> = new Set(ORG_CAPABILITIES)

export function isOrgCapability(value: string): value is OrgCapability {
  return CAPABILITY_SET.has(value)
}

export function parseOrgCapability(value: string): OrgCapability | null {
  if (!isOrgCapability(value)) return null
  return value
}

export type CapabilityAccess = {
  /** Owner → all caps without reading matrix rows. */
  allowAll: boolean
  /** Caps allowed by invite role matrix (allowed=true). */
  matrixAllowed: ReadonlySet<OrgCapability>
  /** Caps from org `bu_owner` matrix column (applied only if isBuOwner). Scoped to their BU. */
  buOwnerAllowed: ReadonlySet<OrgCapability>
  isBuOwner: boolean
}

export function resolvePermissionScope(args: {
  memberRole: string | null | undefined
  isBuOwner: boolean
}): PermissionScope {
  const role = args.memberRole ?? null
  if (role === "owner" || role === "admin") return "org"
  if (args.isBuOwner) return "bu"
  return "own"
}

export function hasCapability(access: CapabilityAccess, capability: OrgCapability): boolean {
  if (access.allowAll) return true
  if (access.matrixAllowed.has(capability)) return true
  if (access.isBuOwner && access.buOwnerAllowed.has(capability)) return true
  return false
}

export function emptyCapabilityAccess(): CapabilityAccess {
  return {
    allowAll: false,
    matrixAllowed: new Set(),
    buOwnerAllowed: new Set(),
    isBuOwner: false,
  }
}

export function ownerCapabilityAccess(): CapabilityAccess {
  return {
    allowAll: true,
    matrixAllowed: new Set(),
    buOwnerAllowed: new Set(),
    isBuOwner: false,
  }
}
