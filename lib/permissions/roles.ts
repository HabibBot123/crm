import type { TeamMemberRole } from "@/lib/services/team"

const ROLE_VALUES: TeamMemberRole[] = ["owner", "admin", "sales", "ambassador", "coach", "staff"]

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  sales: "Sales",
  ambassador: "Ambassador",
  coach: "Coach",
  staff: "Staff",
}

export function isTeamMemberRole(value: string): value is TeamMemberRole {
  return ROLE_VALUES.some((r) => r === value)
}

export function normalizeMemberRole(role: string | null | undefined): TeamMemberRole | null {
  if (!role) return null
  if (!isTeamMemberRole(role)) return null
  return role
}

export function teamMemberRoleLabel(role: string | null | undefined): string {
  if (!role) return "Staff"
  if (isTeamMemberRole(role)) return ROLE_LABELS[role]
  return role.charAt(0).toUpperCase() + role.slice(1)
}
