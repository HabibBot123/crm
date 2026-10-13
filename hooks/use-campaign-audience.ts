"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"

const audienceStatsSchema = z.object({
  opted_in: z.number().int().nonnegative(),
  synced: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
})

const statsResponseSchema = z.object({
  stats: audienceStatsSchema,
})

const syncResponseSchema = z.object({
  attempted: z.number().int().nonnegative(),
  synced: z.number().int().nonnegative(),
  segments: z.number().int().nonnegative().optional(),
  segment_added: z.number().int().nonnegative().optional(),
  segment_removed: z.number().int().nonnegative().optional(),
  stats: audienceStatsSchema,
})

export type CampaignAudienceStats = z.infer<typeof audienceStatsSchema>

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error
  }
  return fallback
}

export function useCampaignAudienceStats(organizationId: number | null) {
  return useQuery({
    queryKey: ["campaign-audience-stats", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/campaign-contacts/sync`
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Failed to load audience"))
      }
      return statsResponseSchema.parse(body).stats
    },
    enabled: !!organizationId,
  })
}

export function useSyncCampaignAudience(organizationId: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/campaign-contacts/sync`,
        { method: "POST" }
      )
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(readErrorMessage(body, "Sync failed"))
      }
      return syncResponseSchema.parse(body)
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-audience-stats", organizationId],
      })
      await queryClient.invalidateQueries({
        queryKey: ["campaign-segments", organizationId],
      })
      const segmentNote =
        data.segments && data.segments > 0
          ? ` · ${data.segment_added ?? 0} added / ${data.segment_removed ?? 0} removed in segments`
          : ""
      if (data.attempted === 0) {
        toast.success(`Audience up to date${segmentNote}`)
        return
      }
      toast.success(
        `Synced ${data.synced} of ${data.attempted} contacts${segmentNote}`
      )
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Sync failed")
    },
  })
}
