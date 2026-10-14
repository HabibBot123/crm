"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createMarketingCampaign,
  duplicateMarketingCampaign,
  fetchMarketingCampaign,
  fetchMarketingCampaignsPage,
  updateMarketingCampaign,
} from "@/lib/services/marketing-campaigns"
import {
  marketingCampaignSchema,
  type CampaignStatus,
  type CreateMarketingCampaignInput,
  type SendMarketingCampaignInput,
  type TestSendMarketingCampaignInput,
  type UpdateMarketingCampaignInput,
} from "@/schemas/marketing-campaign.schema"

const oneResponseSchema = z.object({
  campaign: marketingCampaignSchema,
})

function readErrorMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error
  }
  return fallback
}

export type UseCampaignsPageParams = {
  organizationId: number | null
  page: number
  pageSize: number
  search?: string
  statuses?: CampaignStatus[]
}

export function useCampaignsPage(params: UseCampaignsPageParams) {
  const { supabase } = useAuth()
  const { organizationId, page, pageSize, search, statuses } = params

  return useQuery({
    queryKey: [
      "campaigns",
      organizationId,
      page,
      pageSize,
      search ?? "",
      statuses ?? [],
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchMarketingCampaignsPage({
        supabase,
        organizationId,
        page,
        pageSize,
        search,
        statuses,
      })
    },
    enabled: !!organizationId,
  })
}

export function useCampaign(
  organizationId: number | null,
  campaignId: number | null
) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaigns", organizationId, campaignId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!campaignId) throw new Error("campaignId is required")
      const campaign = await fetchMarketingCampaign(
        supabase,
        organizationId,
        campaignId
      )
      if (!campaign) throw new Error("Campaign not found")
      return campaign
    },
    enabled: !!organizationId && !!campaignId,
  })
}

export function useCreateCampaign(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateMarketingCampaignInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createMarketingCampaign(supabase, organizationId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      toast.success("Campaign created")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create campaign"
      )
    },
  })
}

export function useDuplicateCampaign(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      return duplicateMarketingCampaign(supabase, organizationId, campaignId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      toast.success("Campaign duplicated")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to duplicate campaign"
      )
    },
  })
}

export function useUpdateCampaign(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: { campaignId: number } & UpdateMarketingCampaignInput
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { campaignId, ...payload } = input
      return updateMarketingCampaign(
        supabase,
        organizationId,
        campaignId,
        payload
      )
    },
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId, campaign.id],
      })
      toast.success("Campaign saved")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update campaign"
      )
    },
  })
}

/** Delete via API: scheduled campaigns may call Resend. */
export function useDeleteCampaign(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/campaigns/${campaignId}`,
        { method: "DELETE" }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to delete campaign"))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      toast.success("Campaign deleted")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete campaign"
      )
    },
  })
}

export function useSendCampaign(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: { campaignId: number } & SendMarketingCampaignInput
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { campaignId, ...payload } = input
      const res = await fetch(
        `/api/organizations/${organizationId}/campaigns/${campaignId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to send campaign"))
      }
      return oneResponseSchema.parse(body).campaign
    },
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["campaign-audience-stats", organizationId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["campaign-delivery-stats", organizationId],
      })
      toast.success(
        campaign.status === "scheduled" ? "Campaign scheduled" : "Campaign sent"
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send campaign"
      )
    },
  })
}

export function useCancelCampaign(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/campaigns/${campaignId}/cancel`,
        { method: "POST" }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to cancel campaign"))
      }
      return oneResponseSchema.parse(body).campaign
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaigns", organizationId],
      })
      toast.success("Campaign canceled")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel campaign"
      )
    },
  })
}

export function useTestSendCampaign(organizationId: number | null) {
  return useMutation({
    mutationFn: async (
      input: { campaignId: number } & TestSendMarketingCampaignInput
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { campaignId, ...payload } = input
      const res = await fetch(
        `/api/organizations/${organizationId}/campaigns/${campaignId}/test-send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to send test email"))
      }
    },
    onSuccess: () => {
      toast.success("Test email sent")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test email"
      )
    },
  })
}
