"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import {
  campaignSegmentFilterGroupSchema,
  campaignSegmentSchema,
  type CampaignSegmentFilterGroup,
  type CreateCampaignSegmentInput,
  type UpdateCampaignSegmentInput,
} from "@/schemas/campaign-segment.schema"

const listResponseSchema = z.object({
  segments: z.array(campaignSegmentSchema),
})

const oneResponseSchema = z.object({
  segment: campaignSegmentSchema,
})

const previewResponseSchema = z.object({
  preview: z.object({
    total: z.number().int().nonnegative(),
    synced: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
})

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error
  }
  return fallback
}

export function useCampaignSegments(organizationId: number | null) {
  return useQuery({
    queryKey: ["campaign-segments", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(`/api/organizations/${organizationId}/campaign-segments`)
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error(readErrorMessage(body, "Failed to load segments"))
      return listResponseSchema.parse(body).segments
    },
    enabled: !!organizationId,
  })
}

export function useCreateCampaignSegment(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCampaignSegmentInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(`/api/organizations/${organizationId}/campaign-segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error(readErrorMessage(body, "Failed to create segment"))
      return oneResponseSchema.parse(body).segment
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment created")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create segment")
    },
  })
}

export function useUpdateCampaignSegment(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { segmentId: number } & UpdateCampaignSegmentInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      const { segmentId, ...payload } = input
      const res = await fetch(
        `/api/organizations/${organizationId}/campaign-segments/${segmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error(readErrorMessage(body, "Failed to update segment"))
      return oneResponseSchema.parse(body).segment
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment saved")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update segment")
    },
  })
}

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
      if (!res.ok) throw new Error(readErrorMessage(body, "Failed to delete segment"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      toast.success("Segment deleted")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete segment")
    },
  })
}

export function usePreviewCampaignSegment(organizationId: number | null) {
  return useMutation({
    mutationFn: async (filter_json: CampaignSegmentFilterGroup) => {
      if (!organizationId) throw new Error("organizationId is required")
      campaignSegmentFilterGroupSchema.parse(filter_json)
      const res = await fetch(
        `/api/organizations/${organizationId}/campaign-segments/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filter_json }),
        }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error(readErrorMessage(body, "Failed to preview"))
      return previewResponseSchema.parse(body).preview
    },
  })
}
