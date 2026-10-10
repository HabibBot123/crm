"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useTeamMembers } from "@/hooks/use-team"
import {
  fetchCoachingEnrollmentProductsForOrg,
  fetchCoachingSessionsForEnrollmentProduct,
  upsertCoachingAssignment,
  removeCoachingAssignment,
  updateCoachingSessionCompleted,
  type CoachingEnrollmentProduct,
  type CoachingPackAssignmentFilter,
  type CoachingPackEnrollmentStatus,
  type CoachingSessionRow,
} from "@/lib/services/coaching"
import { toast } from "sonner"

export type OrganizationMemberForSelect = {
  id: number
  user_id: string
  role: string
  display_name: string | null
  default_commission_rate_coach: number | null
  default_commission_fixed_coach: number | null
}

export type UseCoachingPacksParams = {
  organizationId: number | null
  supabase: SupabaseClient | null
  page: number
  pageSize: number
  search?: string
  assignmentFilters?: CoachingPackAssignmentFilter[]
  enrollmentStatuses?: CoachingPackEnrollmentStatus[]
}

export function useCoachingPacks(params: UseCoachingPacksParams) {
  const {
    organizationId,
    supabase,
    page,
    pageSize,
    search = "",
    assignmentFilters = [],
    enrollmentStatuses = [],
  } = params

  const query = useQuery({
    queryKey: [
      "coaching-packs",
      organizationId,
      page,
      pageSize,
      search,
      assignmentFilters,
      enrollmentStatuses,
    ],
    queryFn: () => {
      if (!organizationId || !supabase) throw new Error("organizationId and supabase required")
      return fetchCoachingEnrollmentProductsForOrg(supabase, organizationId, {
        page,
        pageSize,
        search,
        assignmentFilters,
        enrollmentStatuses,
      })
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

export type UsePackSessionsParams = {
  organizationId: number | null
  supabase: SupabaseClient | null
  enrollmentProductId: number | null
  enabled: boolean
}

export function usePackSessions(params: UsePackSessionsParams) {
  const { organizationId, supabase, enrollmentProductId, enabled } = params

  const query = useQuery({
    queryKey: ["coaching-sessions", organizationId, "pack", enrollmentProductId],
    queryFn: () => {
      if (!organizationId || !supabase || enrollmentProductId == null) {
        throw new Error("organizationId, supabase and enrollmentProductId required")
      }
      return fetchCoachingSessionsForEnrollmentProduct(
        supabase,
        organizationId,
        enrollmentProductId
      )
    },
    enabled:
      enabled &&
      !!organizationId &&
      !!supabase &&
      enrollmentProductId != null,
  })

  return {
    data: (query.data ?? []) as CoachingSessionRow[],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type UseTeamMembersForAssignParams = {
  organizationId: number | null
}

export function useTeamMembersForAssign(params: UseTeamMembersForAssignParams) {
  const { organizationId } = params
  const { data, isLoading, error } = useTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
  })

  const activeMembers: OrganizationMemberForSelect[] = (data.items ?? [])
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      user_id: m.user_id ?? "",
      role: m.role,
      display_name: m.full_name ?? null,
      default_commission_rate_coach: m.default_commission_rate_coach,
      default_commission_fixed_coach: m.default_commission_fixed_coach,
    }))

  return {
    data: activeMembers,
    total: data.total,
    isLoading,
    error,
  }
}

function invalidateCoachingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: number | null
) {
  queryClient.invalidateQueries({ queryKey: ["coaching-packs", organizationId] })
  queryClient.invalidateQueries({ queryKey: ["coaching-sessions", organizationId] })
  queryClient.invalidateQueries({ queryKey: ["commissions", organizationId] })
  queryClient.invalidateQueries({ queryKey: ["commissions-due-total", organizationId] })
}

export function useAssignCoachMutation(organizationId: number | null, supabase: SupabaseClient | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      enrollmentProductId,
      organizationMemberId,
      rate,
      fixed,
      isChange,
    }: {
      enrollmentProductId: number
      organizationMemberId: number
      rate?: number | null
      fixed?: number | null
      isChange?: boolean
    }) => {
      if (!supabase) throw new Error("Supabase client required")
      if (organizationId == null) throw new Error("organizationId is required")
      return upsertCoachingAssignment(
        supabase,
        enrollmentProductId,
        organizationMemberId,
        organizationId,
        { rate, fixed }
      ).then((result) => ({ ...result, isChange: isChange === true }))
    },
    onSuccess: (result) => {
      invalidateCoachingQueries(queryClient, organizationId)
      const verb = result.isChange ? "changed" : "assigned"
      toast.success(
        result.createdCount > 0
          ? `Coach ${verb} : commission created`
          : `Coach ${verb} : no commission created`
      )
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveCoachMutation(organizationId: number | null, supabase: SupabaseClient | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ enrollmentProductId }: { enrollmentProductId: number }) => {
      if (!supabase) throw new Error("Supabase client required")
      if (organizationId == null) throw new Error("organizationId is required")
      return removeCoachingAssignment(supabase, organizationId, enrollmentProductId)
    },
    onSuccess: (result) => {
      invalidateCoachingQueries(queryClient, organizationId)
      toast.success(
        result.deletedCommissions > 0
          ? "Coach removed : pending commissions deleted"
          : "Coach removed"
      )
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
