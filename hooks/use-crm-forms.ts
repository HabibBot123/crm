"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  addFieldToForm,
  createForm,
  fetchFormWithFields,
  fetchForms,
  removeFieldFromForm,
  updateForm,
} from "@/lib/services/crm-forms"
import type { CreateFormInput, CrmFormStatus } from "@/schemas/crm.schema"

export function useCrmForms(organizationId: number | null) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: ["crm-forms", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchForms(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    forms: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCrmFormDetail(formId: number | null) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["crm-form", formId],
    queryFn: () => {
      if (!formId) throw new Error("formId is required")
      return fetchFormWithFields(supabase, formId)
    },
    enabled: !!formId,
  })

  return {
    form: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateForm(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateFormInput, "organization_id">) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createForm(supabase, {
        ...input,
        organization_id: organizationId,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-forms", organizationId] })
    },
  })
}

export function useUpdateForm(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      formId: number
      title?: string
      description?: string | null
      status?: CrmFormStatus
      redirect_url?: string | null
      success_message?: string | null
    }) => updateForm(supabase, input.formId, input),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["crm-forms", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-form", vars.formId] })
    },
  })
}

export function useAddFormField(formId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      fieldDefId: number
      position: number
      isRequired: boolean
      visibility?: "visible" | "hidden"
    }) => {
      if (!formId) throw new Error("formId is required")
      await addFieldToForm(supabase, { formId, ...input })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-form", formId] })
    },
  })
}

export function useRemoveFormField(formId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formFieldId: number) => {
      await removeFieldFromForm(supabase, formFieldId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-form", formId] })
    },
  })
}
