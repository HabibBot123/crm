"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchTeamMembers,
  type TeamMembersPage,
  type TeamMemberRole,
  cancelTeamInvitation,
  changeTeamMemberRole,
  revokeTeamAccess,
  type CancelTeamInvitationInput,
  type ChangeTeamMemberRoleInput,
  type RevokeTeamAccessInput,
} from "@/lib/services/team"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

export type UseTeamMembersParams = {
  organizationId: number | null
  page: number
  pageSize: number
  search?: string
}

export function useTeamMembers(params: UseTeamMembersParams) {
  const { organizationId, page, pageSize, search } = params

  const query = useQuery({
    queryKey: ["team-members", organizationId, page, pageSize, search],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("organizationId is required to fetch team members")
      }
      return fetchTeamMembers({ organizationId, page, pageSize, search })
    },
    enabled: !!organizationId,
  })

  return {
    data: (query.data ?? { items: [], total: 0 }) as TeamMembersPage,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type InviteTeamMemberVariables = {
  organizationId: number
  email: string
  role: Exclude<TeamMemberRole, "owner">
}

export function useInviteTeamMember(organizationId: number | null) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (variables: InviteTeamMemberVariables) => {
      const res = await fetch(`/api/organizations/${variables.organizationId}/invitations/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: variables.email,
          role: variables.role,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message =
          body && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Failed to send invitation"
        throw new Error(message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Invitation sent")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })

  return mutation
}

export type CancelTeamInvitationVariables = {
  organizationId: number
  memberId: number
}

export function useCancelTeamInvitation(organizationId: number | null) {
  const queryClient = useQueryClient()
  const { user, supabase } = useAuth()

  return useMutation({
    mutationFn: async (variables: CancelTeamInvitationVariables) => {
      if (!variables.organizationId) throw new Error("organizationId is required")
      if (!user) throw new Error("Unauthorized")

      await cancelTeamInvitation(supabase, {
        organizationId: variables.organizationId,
        memberId: variables.memberId,
        requesterUserId: user.id,
      } satisfies CancelTeamInvitationInput)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Invitation cancelled")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

export type ChangeTeamMemberRoleVariables = {
  organizationId: number
  memberId: number
  role: Exclude<TeamMemberRole, "owner">
}

export function useChangeTeamMemberRole(organizationId: number | null) {
  const queryClient = useQueryClient()
  const { user, supabase } = useAuth()

  return useMutation({
    mutationFn: async (variables: ChangeTeamMemberRoleVariables) => {
      if (!variables.organizationId) throw new Error("organizationId is required")
      if (!user) throw new Error("Unauthorized")

      await changeTeamMemberRole(supabase, {
        organizationId: variables.organizationId,
        memberId: variables.memberId,
        role: variables.role,
        requesterUserId: user.id,
      } satisfies ChangeTeamMemberRoleInput)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Role updated")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

export type RevokeTeamAccessVariables = {
  organizationId: number
  memberId: number
}

export function useRevokeTeamAccess(organizationId: number | null) {
  const queryClient = useQueryClient()
  const { user, supabase } = useAuth()

  return useMutation({
    mutationFn: async (variables: RevokeTeamAccessVariables) => {
      if (!variables.organizationId) throw new Error("organizationId is required")
      if (!user) throw new Error("Unauthorized")

      await revokeTeamAccess(supabase, {
        organizationId: variables.organizationId,
        memberId: variables.memberId,
        requesterUserId: user.id,
      } satisfies RevokeTeamAccessInput)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] })
      toast.success("Access revoked")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

