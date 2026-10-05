"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createBusinessUnit,
  fetchBusinessUnits,
  updateBusinessUnit,
  updateBusinessUnitStatus,
} from "@/lib/services/business-units"
import type {
  BusinessUnitStatus,
  CreateBusinessUnitInput,
  UpdateBusinessUnitInput,
} from "@/schemas/crm.schema"

export function useBusinessUnits(
  organizationId: number | null,
  options?: { includeArchived?: boolean }
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["business-units", organizationId, options?.includeArchived ?? false],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchBusinessUnits(supabase, organizationId, options)
    },
    enabled: !!organizationId,
  })

  return {
    units: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateBusinessUnit(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateBusinessUnitInput, "organization_id">) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createBusinessUnit(supabase, {
        ...input,
        organization_id: organizationId,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business-units", organizationId] })
    },
  })
}

export function useUpdateBusinessUnitStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: number; status: BusinessUnitStatus }) =>
      updateBusinessUnitStatus(supabase, input.id, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business-units", organizationId] })
    },
  })
}

export function useUpdateBusinessUnit(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: number; patch: UpdateBusinessUnitInput }) =>
      updateBusinessUnit(supabase, input.id, input.patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business-units", organizationId] })
    },
  })
}
