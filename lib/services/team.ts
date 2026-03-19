import type { SupabaseClient } from "@supabase/supabase-js"
import { sendInviteTeamMemberEmail } from "@/lib/email/workflows/send-invite-team-member-email"

export type TeamMemberStatus = "invited" | "active" | "revoked"

export type TeamMemberRole = "owner" | "admin" | "sales" | "ambassador" | "member"

export type TeamMember = {
  id: number
  organization_id: number
  user_id: string | null
  email: string | null
  full_name: string | null
  role: TeamMemberRole
  status: TeamMemberStatus
  invited_at: string | null
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export type TeamMembersPage = {
  items: TeamMember[]
  total: number
}

export type FetchTeamMembersParams = {
  organizationId: number
  page: number
  pageSize: number
  search?: string
}

export type TeamInvitationInfo = {
  email: string | null
  organization_id: number
  organization_name: string | null
}

export async function fetchTeamMembers(
  params: FetchTeamMembersParams
): Promise<TeamMembersPage> {
  const { organizationId, page, pageSize, search: searchTerm } = params
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (searchTerm?.trim()) searchParams.set("search", searchTerm.trim())

  const res = await fetch(`/api/organizations/${organizationId}/team?${searchParams.toString()}`, {
    method: "GET",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Failed to load team members"
    throw new Error(message)
  }

  const json = (await res.json()) as TeamMembersPage
  return json
}

export async function fetchTeamInvitation(token: string): Promise<TeamInvitationInfo> {
  const search = new URLSearchParams({ token })
  const res = await fetch(`/api/invitations/team?${search.toString()}`, {
    method: "GET",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Unable to load invitation. It may have expired or been used."
    throw new Error(message)
  }

  return (await res.json()) as TeamInvitationInfo
}

export type InviteTeamMemberInput = {
  organizationId: number
  email: string
  role: Exclude<TeamMemberRole, "owner">
}

export async function inviteTeamMember(
  adminClient: SupabaseClient,
  input: InviteTeamMemberInput,
  inviter: { id: string; fullName: string | null },
  orgName: string | null,
  baseUrl: string
): Promise<void> {
  const { organizationId, email, role } = input
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error("Email is required")
  }

  const tokenBytes = crypto.randomUUID()
  const invitationToken = `${tokenBytes}-${Date.now()}`

  const { error } = await adminClient.from("organization_members").insert({
    organization_id: organizationId,
    email: normalizedEmail,
    role,
    status: "invited",
    invited_at: new Date().toISOString(),
    invitation_token: invitationToken,
  })

  if (error) {
    throw error
  }

  const acceptUrl = new URL("/invite/team", baseUrl)
  acceptUrl.searchParams.set("token", invitationToken)

  await sendInviteTeamMemberEmail({
    to: normalizedEmail,
    inviterName: inviter.fullName,
    orgName,
    acceptUrl: acceptUrl.toString(),
  })
}

export type AcceptTeamInvitationResult = {
  organization_id?: number
}

export async function acceptTeamInvitation(token: string): Promise<AcceptTeamInvitationResult> {
  const res = await fetch("/api/invitations/team", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Unable to accept invitation. Please try again."
    throw new Error(message)
  }

  return (await res.json()) as AcceptTeamInvitationResult
}

export type CancelTeamInvitationInput = {
  organizationId: number
  memberId: number
  requesterUserId: string
}

async function assertRequesterIsOwnerOrAdmin(
  supabase: SupabaseClient,
  organizationId: number,
  requesterUserId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("status, role")
    .eq("organization_id", organizationId)
    .eq("user_id", requesterUserId)
    .maybeSingle()

  if (error) throw new Error("Failed to verify your membership.")
  if (!data || data.status !== "active") throw new Error("You are not an active member of this organization.")

  if (data.role !== "owner" && data.role !== "admin") {
    throw new Error("Only owner or admin can manage team members.")
  }
}

export async function cancelTeamInvitation(
  supabase: SupabaseClient,
  input: CancelTeamInvitationInput
): Promise<void> {
  const { organizationId, memberId, requesterUserId } = input

  await assertRequesterIsOwnerOrAdmin(supabase, organizationId, requesterUserId)

  const { data: target, error: targetError } = await supabase
    .from("organization_members")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle()

  if (targetError) throw new Error("Failed to load invitation.")
  if (!target) throw new Error("Member not found.")
  if (target.status !== "invited") throw new Error("Only pending invitations can be cancelled.")

  const { error: deleteError } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", memberId)

  if (deleteError) throw new Error("Failed to cancel invitation.")
}

export type ChangeTeamMemberRoleInput = {
  organizationId: number
  memberId: number
  role: Exclude<TeamMemberRole, "owner">
  requesterUserId: string
}

export async function changeTeamMemberRole(
  supabase: SupabaseClient,
  input: ChangeTeamMemberRoleInput
): Promise<void> {
  const { organizationId, memberId, role, requesterUserId } = input

  await assertRequesterIsOwnerOrAdmin(supabase, organizationId, requesterUserId)

  const { data: target, error: targetError } = await supabase
    .from("organization_members")
    .select("id, status, role")
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle()

  if (targetError) throw new Error("Failed to load member.")
  if (!target) throw new Error("Member not found.")
  if (target.role === "owner") throw new Error("You can't change the owner role.")
  if (target.status === "revoked") throw new Error("Can't change role for revoked members.")

  const { error: updateError } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("organization_id", organizationId)
    .eq("id", memberId)

  if (updateError) throw new Error("Failed to change role.")
}

export type RevokeTeamAccessInput = {
  organizationId: number
  memberId: number
  requesterUserId: string
}

export async function revokeTeamAccess(
  supabase: SupabaseClient,
  input: RevokeTeamAccessInput
): Promise<void> {
  const { organizationId, memberId, requesterUserId } = input

  await assertRequesterIsOwnerOrAdmin(supabase, organizationId, requesterUserId)

  const { data: target, error: targetError } = await supabase
    .from("organization_members")
    .select("id, status, user_id, role")
    .eq("organization_id", organizationId)
    .eq("id", memberId)
    .maybeSingle()

  if (targetError) throw new Error("Failed to load member.")
  if (!target) throw new Error("Member not found.")
  if (target.user_id === requesterUserId) throw new Error("You can't revoke your own access.")
  if (target.role === "owner") throw new Error("You can't revoke the owner's access.")
  if (target.status !== "active") throw new Error("Only active members can be revoked.")

  const revokedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("organization_members")
    .update({ status: "revoked", revoked_at: revokedAt })
    .eq("organization_id", organizationId)
    .eq("id", memberId)

  if (updateError) throw new Error("Failed to revoke access.")
}

