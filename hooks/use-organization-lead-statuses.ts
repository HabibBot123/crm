"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createOrganizationLeadStatus,
  deleteOrganizationLeadStatus,
  fetchOrganizationLeadStatuses,
  updateOrganizationLeadStatus,
} from "@/lib/services/organization-lead-statuses"
import type {
  CreateOrganizationLeadStatusInput,
  UpdateOrganizationLeadStatusInput,
} from "@/schemas/crm.schema"

export function useOrganizationLeadStatuses(organizationId: number | null) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: ["organization-lead-statuses", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchOrganizationLeadStatuses(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    statuses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateOrganizationLeadStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      input: Omit<CreateOrganizationLeadStatusInput, "organization_id">
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createOrganizationLeadStatus(supabase, {
        ...input,
        organization_id: organizationId,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-lead-statuses", organizationId],
      })
    },
  })
}

export function useUpdateOrganizationLeadStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateOrganizationLeadStatusInput) =>
      updateOrganizationLeadStatus(supabase, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-lead-statuses", organizationId],
      })
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
    },
  })
}

export function useDeleteOrganizationLeadStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (statusId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      return deleteOrganizationLeadStatus(supabase, { organizationId, statusId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organization-lead-statuses", organizationId],
      })
    },
  })
}
