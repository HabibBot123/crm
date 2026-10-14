"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createCampaignSegment,
  fetchCampaignSegments,
  previewCampaignSegment,
  updateCampaignSegment,
} from "@/lib/services/campaign-segments"
import {
  campaignSegmentFilterGroupSchema,
  type CampaignSegmentFilterGroup,
  type CreateCampaignSegmentInput,
  type UpdateCampaignSegmentInput,
} from "@/schemas/campaign-segment.schema"

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

export function useCampaignSegments(organizationId: number | null) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaign-segments", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCampaignSegments(supabase, organizationId)
    },
    enabled: !!organizationId,
  })
}

export function useCreateCampaignSegment(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignSegmentInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createCampaignSegment(supabase, organizationId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment created")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create segment"
      )
    },
  })
}

export function useUpdateCampaignSegment(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      input: { segmentId: number } & UpdateCampaignSegmentInput
    ) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { segmentId, ...payload } = input
      return updateCampaignSegment(
        supabase,
        organizationId,
        segmentId,
        payload
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment saved")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update segment"
      )
    },
  })
}

/** Delete goes through API: may remove Resend segment (API key). */
export function useDeleteCampaignSegment(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (segmentId: number) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/campaign-segments/${segmentId}`,
        { method: "DELETE" }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to delete segment"))
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment deleted")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete segment"
      )
    },
  })
}

export function usePreviewCampaignSegment(organizationId: number | null) {
  const { supabase } = useAuth()
  return useMutation({
    mutationFn: async (filter_json: CampaignSegmentFilterGroup) => {
      if (!organizationId) throw new Error("organizationId is required")
      campaignSegmentFilterGroupSchema.parse(filter_json)
      return previewCampaignSegment(supabase, organizationId, filter_json)
    },
  })
}
