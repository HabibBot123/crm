import type { TeamMember } from "@/lib/services/team"
import { normalizeMemberRole } from "@/lib/permissions/roles"

export function canManageTeam(actorRole: string | null | undefined): boolean {
  const role = normalizeMemberRole(actorRole)
  return role === "owner" || role === "admin"
}

export function canCancelInvitation({
  actorRole,
  member,
  isSelf,
}: {
  actorRole: string | null | undefined
  member: TeamMember
  isSelf: boolean
}): boolean {
  return canManageTeam(actorRole) && !isSelf && member.status === "invited"
}

export function canChangeMemberRole({
  actorRole,
  member,
  isSelf,
}: {
  actorRole: string | null | undefined
  member: TeamMember
  isSelf: boolean
}): boolean {
  return (
    canManageTeam(actorRole) &&
    !isSelf &&
    member.role !== "owner" &&
    member.status !== "revoked"
  )
}

export function canRevokeAccess({
  actorRole,
  member,
  isSelf,
}: {
  actorRole: string | null | undefined
  member: TeamMember
  isSelf: boolean
}): boolean {
  return canManageTeam(actorRole) && !isSelf && member.role !== "owner" && member.status === "active"
}

export function getMemberPrimaryStatusText(member: TeamMember): string | null {
  switch (member.status) {
    case "invited":
      return "Invitation pending"
    case "active":
      return null
    case "revoked":
      return "Access revoked"
    default:
      return null
  }
}

export type TeamPermissionActions = {
  canCancelInvitation: boolean
  canChangeMemberRole: boolean
  canRevokeAccess: boolean
}

export function getMemberActionsPermissions({
  actorRole,
  member,
  isSelf,
}: {
  actorRole: string | null | undefined
  member: TeamMember
  isSelf: boolean
}): TeamPermissionActions {
  return {
    canCancelInvitation: canCancelInvitation({ actorRole, member, isSelf }),
    canChangeMemberRole: canChangeMemberRole({ actorRole, member, isSelf }),
    canRevokeAccess: canRevokeAccess({ actorRole, member, isSelf }),
  }
}

