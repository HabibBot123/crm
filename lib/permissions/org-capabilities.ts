import type { TeamMember } from "@/lib/services/team"
import { getCrmCapabilities, type CrmCapabilities } from "@/lib/permissions/crm"
import type { TeamPermissionActions } from "@/lib/permissions/team"
import {
  emptyCapabilityAccess,
  hasCapability,
  ownerCapabilityAccess,
  type CapabilityAccess,
  type OrgCapability,
  type PermissionScope,
} from "@/lib/permissions/capabilities"

export type { CrmCapabilities, OrgCapability, PermissionScope }

export type OrganizationMode = "solo" | "team"

/**
 * Product UX flags from org.mode (solo vs team).
 * RLS remains authoritative; these only drive hide/gate UI.
 */
export type OrgModeFeatures = {
  mode: OrganizationMode
  isTeam: boolean
  /** CRM closer / setter / ambassador columns + lead attributions / commissions activate */
  showAcquisitionRoles: boolean
  /** Assigned sales column + pipeline assign on leads */
  showLeadSalesAssignment: boolean
  /** Business unit column / forms BU management (team) */
  showBusinessUnits: boolean
  /** Coaching assign coach UI */
  showCoachAssign: boolean
  /**
   * Full pages that stay in nav but show upgrade gate in solo:
   * Team, Commissions, Business units.
   */
  requiresTeamPlan: boolean
}

export function parseOrganizationMode(value: unknown): OrganizationMode {
  if (value === "solo" || value === "team") return value
  return "solo"
}

export function getOrgModeFeatures(mode: OrganizationMode | null | undefined): OrgModeFeatures {
  const resolved = mode === "team" ? "team" : "solo"
  const isTeam = resolved === "team"
  return {
    mode: resolved,
    isTeam,
    showAcquisitionRoles: isTeam,
    showLeadSalesAssignment: isTeam,
    showBusinessUnits: isTeam,
    showCoachAssign: isTeam,
    requiresTeamPlan: !isTeam,
  }
}

/**
 * Single exit for org-scoped permission checks (UX only; RLS is authoritative).
 */
export type OrgPermissions = {
  mode: OrgModeFeatures
  /** Effective data scope for list filtering. */
  scope: PermissionScope
  /** True if current member owns ≥1 active BU. */
  isBuOwner: boolean
  /** Active BU ids owned by the current member (empty unless scope can be `bu`). */
  ownedBusinessUnitIds: number[]
  /** Capability check (matrix ∪ owner ∪ BU grants). */
  can: (capability: OrgCapability) => boolean
  /** @deprecated Prefer `can(...)` — kept for existing CRM links UI. */
  crm: CrmCapabilities
  team: {
    canManageTeam: boolean
    memberActions: (member: TeamMember, isSelf: boolean) => TeamPermissionActions
  }
}

export type GetOrgPermissionsInput = {
  memberRole: string | null | undefined
  orgMode?: OrganizationMode | null
  access?: CapabilityAccess
  scope?: PermissionScope
  ownedBusinessUnitIds?: number[]
}

export function getOrgPermissions(input: GetOrgPermissionsInput): OrgPermissions {
  const memberRole = input.memberRole ?? null
  const access =
    input.access ??
    (memberRole === "owner" ? ownerCapabilityAccess() : emptyCapabilityAccess())
  const scope = input.scope ?? (memberRole === "owner" || memberRole === "admin" ? "org" : "own")
  const ownedBusinessUnitIds = input.ownedBusinessUnitIds ?? []

  const can = (capability: OrgCapability) => hasCapability(access, capability)

  const canManageTeam =
    can("team.invite") || can("team.manage_roles") || can("team.revoke")

  return {
    mode: getOrgModeFeatures(input.orgMode),
    scope,
    isBuOwner: access.isBuOwner,
    ownedBusinessUnitIds,
    can,
    crm: {
      ...getCrmCapabilities(memberRole),
      canViewAllAmbassadorLinks:
        can("forms.links.manage_others") || memberRole === "owner" || memberRole === "admin",
      canCreateAmbassadorLinkForAnyMember:
        can("forms.links.manage_others") || memberRole === "owner" || memberRole === "admin",
    },
    team: {
      canManageTeam,
      memberActions: (member, isSelf): TeamPermissionActions => ({
        canCancelInvitation: can("team.revoke") && !isSelf && member.status === "invited",
        canChangeMemberRole:
          can("team.manage_roles") &&
          !isSelf &&
          member.role !== "owner" &&
          member.status !== "revoked",
        canRevokeAccess:
          can("team.revoke") && !isSelf && member.role !== "owner" && member.status === "active",
      }),
    },
  }
}
