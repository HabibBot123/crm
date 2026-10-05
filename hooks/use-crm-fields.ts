"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createCrmField,
  deleteCrmField,
  fetchCrmFields,
  updateCrmField,
} from "@/lib/services/crm"
import type { CrmField } from "@/schemas/crm.schema"

export function useCrmFields(organizationId: number | null) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: ["crm-fields", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCrmFields(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    fields: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateCrmField(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      key: string
      label: string
      clientQuestion: string
      fieldType: CrmField["field_type"]
      options?: { value: string; label: string }[] | null
      isRequired?: boolean
      showInCrm?: boolean
      position?: number
    }) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createCrmField(supabase, { ...input, organizationId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-fields", organizationId] })
    },
  })
}

export function useUpdateCrmField(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      fieldId: number
      label?: string
      clientQuestion?: string
      options?: { value: string; label: string }[] | null
      isRequired?: boolean
      showInCrm?: boolean
      position?: number
    }) => updateCrmField(supabase, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-fields", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
    },
  })
}

export function useDeleteCrmField(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (fieldId: number) => deleteCrmField(supabase, fieldId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-fields", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-leads"] })
    },
  })
}
