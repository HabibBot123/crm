"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCampaignAudienceContactsPage,
  fetchCampaignAudienceStats,
} from "@/lib/services/campaign-contacts"
import type { CampaignAudienceOrigin } from "@/schemas/campaign.schema"

const syncResponseSchema = z.object({
  attempted: z.number().int().nonnegative(),
  synced: z.number().int().nonnegative(),
  segments: z.number().int().nonnegative().optional(),
  segment_added: z.number().int().nonnegative().optional(),
  segment_removed: z.number().int().nonnegative().optional(),
  stats: z.object({
    opted_in: z.number().int().nonnegative(),
    synced: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
})

export type CampaignAudienceStats = {
  opted_in: number
  synced: number
  pending: number
}

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

export function useCampaignAudienceStats(organizationId: number | null) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaign-audience-stats", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCampaignAudienceStats(supabase, organizationId)
    },
    enabled: !!organizationId,
  })
}

export type UseCampaignAudienceContactsPageParams = {
  organizationId: number | null
  page: number
  pageSize: number
  search?: string
  origins?: CampaignAudienceOrigin[]
  optIn?: boolean | null
  synced?: boolean | null
  enabled?: boolean
}

export function useCampaignAudienceContactsPage(
  params: UseCampaignAudienceContactsPageParams
) {
  const { supabase } = useAuth()
  const {
    organizationId,
    page,
    pageSize,
    search,
    origins,
    optIn,
    synced,
    enabled = true,
  } = params

  return useQuery({
    queryKey: [
      "campaign-audience-contacts",
      organizationId,
      page,
      pageSize,
      search ?? "",
      origins ?? [],
      optIn ?? null,
      synced ?? null,
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCampaignAudienceContactsPage({
        supabase,
        organizationId,
        page,
        pageSize,
        search,
        origins,
        optIn,
        synced,
      })
    },
    enabled: enabled && !!organizationId,
  })
}

/** Sync via API: Resend upsert + segment reconcile need API key. */
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
        queryKey: ["campaign-audience-contacts", organizationId],
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
