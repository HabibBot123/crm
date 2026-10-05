import type { TeamMemberRole } from "@/lib/services/team"
import { normalizeMemberRole } from "@/lib/permissions/roles"

/** CRM UX flags for the current org membership (RLS remains server truth). */
export type CrmCapabilities = {
  canViewAllAmbassadorLinks: boolean
  canCreateAmbassadorLinkForAnyMember: boolean
}

const ADMIN_SCOPED_ROLES: TeamMemberRole[] = ["owner", "admin"]

function hasAdminScope(role: TeamMemberRole | null): boolean {
  if (!role) return false
  return ADMIN_SCOPED_ROLES.includes(role)
}

export function getCrmCapabilities(memberRole: string | null | undefined): CrmCapabilities {
  const role = normalizeMemberRole(memberRole)
  const adminScope = hasAdminScope(role)
  return {
    canViewAllAmbassadorLinks: adminScope,
    canCreateAmbassadorLinkForAnyMember: adminScope,
  }
}
