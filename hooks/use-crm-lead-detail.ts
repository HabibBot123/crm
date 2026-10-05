"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createLeadAttribution,
  fetchLeadDetail,
  fetchLeadStatusHistory,
  updateLeadFields,
  type LeadAttributionInput,
} from "@/lib/services/crm"

export function useCrmLeadDetail(params: {
  leadId: number | null
}) {
  const { supabase } = useAuth()
  const { leadId } = params

  const leadQuery = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => {
      if (!leadId) throw new Error("leadId is required")
      return fetchLeadDetail(supabase, leadId)
    },
    enabled: !!leadId,
  })

  const statusQuery = useQuery({
    queryKey: ["crm-lead-status", leadId],
    queryFn: () => {
      if (!leadId) throw new Error("leadId is required")
      return fetchLeadStatusHistory(supabase, leadId)
    },
    enabled: !!leadId,
  })

  return {
    lead: leadQuery.data ?? null,
    statusHistory: statusQuery.data ?? [],
    isLoading: leadQuery.isLoading || statusQuery.isLoading,
    error: leadQuery.error ?? statusQuery.error,
  }
}

export function useUpdateLeadFields(leadId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: { fieldDefId: number; value: string }[]) => {
      if (!leadId) throw new Error("leadId is required")
      return updateLeadFields(supabase, { leadId, values })
    },
    onSuccess: async () => {
      if (!leadId) return
      await queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
    },
  })
}

export function useCreateLeadAttribution(leadId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (attribution: LeadAttributionInput) => {
      if (!leadId) throw new Error("leadId is required")
      return createLeadAttribution(supabase, { leadId, attribution })
    },
    onSuccess: async () => {
      if (!leadId) return
      await queryClient.invalidateQueries({ queryKey: ["crm-lead", leadId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
    },
  })
}
