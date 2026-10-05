"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createLead,
  fetchSalesMembers,
  fetchAttributionMembers,
  fetchLeadsPage,
  updateLeadAssignment,
  updateLeadStatus,
  type CrmLeadsFilters,
} from "@/lib/services/crm"
import type { CreateLeadInput, LeadStatus } from "@/schemas/crm.schema"

export function useCrmLeads(params: {
  organizationId: number | null
  page: number
  pageSize: number
  filters?: CrmLeadsFilters
}) {
  const { supabase } = useAuth()
  const { organizationId, page, pageSize, filters } = params

  const query = useQuery({
    queryKey: ["crm-leads", organizationId, page, pageSize, filters],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("organizationId is required to fetch CRM leads")
      }
      return fetchLeadsPage(supabase, {
        organizationId,
        page,
        pageSize,
        filters,
      })
    },
    enabled: !!organizationId,
  })

  return {
    data: query.data ?? { items: [], total: 0 },
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateLead(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateLeadInput, "organization_id">) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createLead(supabase, { ...input, organization_id: organizationId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
    },
  })
}

export function useUpdateLeadStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      leadId: number
      toStatus: LeadStatus
      changedByMemberId: number | null
      note?: string | null
    }) => updateLeadStatus(supabase, input),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead", vars.leadId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead-status", vars.leadId] })
    },
  })
}

export function useUpdateLeadAssignment(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { leadId: number; assignedSalesId: number | null }) =>
      updateLeadAssignment(supabase, input),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead", vars.leadId] })
    },
  })
}

export function useCrmSalesMembers(organizationId: number | null) {
  const query = useQuery({
    queryKey: ["crm-sales-members", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchSalesMembers(organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCrmAttributionMembers(organizationId: number | null) {
  const query = useQuery({
    queryKey: ["crm-attribution-members", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchAttributionMembers(organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
