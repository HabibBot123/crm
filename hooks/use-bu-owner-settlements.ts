"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchBuOwnerSettlements,
  fetchBuOwnerSettlementsSummaryByOwner,
  markBuOwnerSettlementsPaid,
  markBuOwnerSettlementsUnpaid,
  type BuOwnerSettlementListFilters,
} from "@/lib/services/bu-owner-settlements"
import { toast } from "sonner"

function invalidateSettlementQueries(
  queryClient: QueryClient,
  organizationId: number | null
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["bu-owner-settlements", organizationId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["bu-owner-settlements-summary", organizationId],
    }),
    queryClient.invalidateQueries({
      queryKey: ["crm-sales-analytics", organizationId],
    }),
  ])
}

export function useBuOwnerSettlements(
  organizationId: number | null,
  options: BuOwnerSettlementListFilters = {}
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["bu-owner-settlements", organizationId, options],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchBuOwnerSettlements(supabase, organizationId, options)
    },
    enabled: !!organizationId,
  })

  return {
    settlements: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useBuOwnerSettlementsSummaryByOwner(
  organizationId: number | null,
  options: BuOwnerSettlementListFilters = {},
  enabled = true
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["bu-owner-settlements-summary", organizationId, options],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchBuOwnerSettlementsSummaryByOwner(
        supabase,
        organizationId,
        options
      )
    },
    enabled: !!organizationId && enabled,
  })

  return {
    summaries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useMarkBuOwnerSettlementsPaid(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      settlementIds: number[]
      paidByMemberId: number
    }) => {
      if (!organizationId) throw new Error("organizationId is required")
      return markBuOwnerSettlementsPaid(
        supabase,
        organizationId,
        input.settlementIds,
        input.paidByMemberId
      )
    },
    onSuccess: async () => {
      await invalidateSettlementQueries(queryClient, organizationId)
      toast.success("Marked as paid")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not mark as paid")
    },
  })
}

export function useMarkBuOwnerSettlementsUnpaid(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { settlementIds: number[] }) => {
      if (!organizationId) throw new Error("organizationId is required")
      return markBuOwnerSettlementsUnpaid(
        supabase,
        organizationId,
        input.settlementIds
      )
    },
    onSuccess: async () => {
      await invalidateSettlementQueries(queryClient, organizationId)
      toast.success("Marked as pending")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not mark as pending"
      )
    },
  })
}
