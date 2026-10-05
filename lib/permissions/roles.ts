import type { TeamMemberRole } from "@/lib/services/team"

const ROLE_VALUES: TeamMemberRole[] = ["owner", "admin", "sales", "ambassador", "coach", "member"]

export function isTeamMemberRole(value: string): value is TeamMemberRole {
  return ROLE_VALUES.some((r) => r === value)
}

export function normalizeMemberRole(role: string | null | undefined): TeamMemberRole | null {
  if (!role) return null
  if (!isTeamMemberRole(role)) return null
  return role
}
