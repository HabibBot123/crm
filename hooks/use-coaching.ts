"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useTeamMembers } from "@/hooks/use-team"
import {
  fetchCoachingEnrollmentProductsForOrg,
  fetchCoachingSessionsForOrg,
  upsertCoachingAssignment,
  updateCoachingSessionCompleted,
  type CoachingEnrollmentProduct,
  type CoachingSessionRow,
} from "@/lib/services/coaching"
import { toast } from "sonner"

export type OrganizationMemberForSelect = {
  id: number
  user_id: string
  role: string
  display_name: string | null
}

export type UseCoachingPacksParams = {
  organizationId: number | null
  supabase: SupabaseClient | null
  page: number
  pageSize: number
}

export function useCoachingPacks(params: UseCoachingPacksParams) {
  const { organizationId, supabase, page, pageSize } = params

  const query = useQuery({
    queryKey: ["coaching-packs", organizationId, page, pageSize],
    queryFn: () => {
      if (!organizationId || !supabase) throw new Error("organizationId and supabase required")
      return fetchCoachingEnrollmentProductsForOrg(supabase, organizationId, page, pageSize)
    },
    enabled: !!organizationId && !!supabase,
  })

  return {
    data: (query.data?.items ?? []) as CoachingEnrollmentProduct[],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type UseCoachingSessionsParams = {
  organizationId: number | null
  supabase: SupabaseClient | null
  page: number
  pageSize: number
}

export function useCoachingSessions(params: UseCoachingSessionsParams) {
  const { organizationId, supabase, page, pageSize } = params

  const query = useQuery({
    queryKey: ["coaching-sessions", organizationId, page, pageSize],
    queryFn: () => {
      if (!organizationId || !supabase) throw new Error("organizationId and supabase required")
      return fetchCoachingSessionsForOrg(supabase, organizationId, page, pageSize)
    },
    enabled: !!organizationId && !!supabase,
  })

  return {
    data: (query.data?.items ?? []) as CoachingSessionRow[],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type UseTeamMembersForAssignParams = {
  organizationId: number | null
  search: string
}

export function useTeamMembersForAssign(params: UseTeamMembersForAssignParams) {
  const { organizationId, search } = params
  const { data, isLoading, error } = useTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
    search: search.trim() || undefined,
  })

  const activeMembers: OrganizationMemberForSelect[] = (data.items ?? [])
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      user_id: m.user_id ?? "",
      role: m.role,
      display_name: m.full_name ?? null,
    }))

  return {
    data: activeMembers,
    total: data.total,
    isLoading,
    error,
  }
}

export function useAssignCoachMutation(organizationId: number | null, supabase: SupabaseClient | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      enrollmentProductId,
      organizationMemberId,
    }: {
      enrollmentProductId: number
      organizationMemberId: number
    }) => {
      if (!supabase) throw new Error("Supabase client required")
      return upsertCoachingAssignment(supabase, enrollmentProductId, organizationMemberId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-packs", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions", organizationId] })
      toast.success("Coach assigned")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCompleteSessionMutation(organizationId: number | null, supabase: SupabaseClient | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, completed }: { sessionId: number; completed: boolean }) => {
      if (!supabase) throw new Error("Supabase client required")
      return updateCoachingSessionCompleted(
        supabase,
        sessionId,
        completed ? new Date().toISOString() : null
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["coaching-packs", organizationId] })
      toast.success("Session updated")
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
