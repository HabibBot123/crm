"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createCampaignEmailTemplate,
  deleteCampaignEmailTemplate,
  fetchCampaignEmailTemplate,
  fetchCampaignEmailTemplates,
  updateCampaignEmailTemplate,
} from "@/lib/services/campaign-email-templates"
import type {
  CreateCampaignEmailTemplateInput,
  UpdateCampaignEmailTemplateInput,
} from "@/schemas/campaign-email-template.schema"

export function useCampaignEmailTemplates(organizationId: number | null) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaign-email-templates", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCampaignEmailTemplates(supabase, organizationId)
    },
    enabled: !!organizationId,
  })
}

export function useCampaignEmailTemplate(
  organizationId: number | null,
  templateId: number | null
) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaign-email-templates", organizationId, templateId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!templateId) throw new Error("templateId is required")
      const template = await fetchCampaignEmailTemplate(
        supabase,
        organizationId,
        templateId
      )
      if (!template) throw new Error("Template not found")
      return template
    },
    enabled: !!organizationId && !!templateId,
  })
}

export function useCreateCampaignEmailTemplate(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignEmailTemplateInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createCampaignEmailTemplate(supabase, organizationId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-email-templates", organizationId],
      })
      toast.success("Template created")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create template"
      )
    },
  })
}

export function useUpdateCampaignEmailTemplate(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: { templateId: number } & UpdateCampaignEmailTemplateInput
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { templateId, ...payload } = input
      return updateCampaignEmailTemplate(
        supabase,
        organizationId,
        templateId,
        payload
      )
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-email-templates", organizationId],
      })
      await queryClient.invalidateQueries({
        queryKey: [
          "campaign-email-templates",
          organizationId,
          variables.templateId,
        ],
      })
      toast.success("Template saved")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update template"
      )
    },
  })
}

export function useDeleteCampaignEmailTemplate(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      await deleteCampaignEmailTemplate(supabase, organizationId, templateId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-email-templates", organizationId],
      })
      toast.success("Template deleted")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete template"
      )
    },
  })
}
