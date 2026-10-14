"use client"

import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCampaignDeliveryStats,
  fetchCampaignRecipientEvents,
  fetchCampaignRecipientsPage,
} from "@/lib/services/campaign-delivery"
import {
  campaignRecipientSentEmailSchema,
  type CampaignRecipientStatus,
} from "@/schemas/campaign-delivery.schema"

const sentEmailResponseSchema = z.object({
  email: campaignRecipientSentEmailSchema.nullable(),
})

export function useCampaignDeliveryStats(organizationId: number | null) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["campaign-delivery-stats", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCampaignDeliveryStats(supabase, organizationId)
    },
    enabled: !!organizationId,
  })
}

export type UseCampaignRecipientsPageParams = {
  organizationId: number | null
  campaignId: number | null
  page: number
  pageSize: number
  search?: string
  statuses?: CampaignRecipientStatus[]
}

export function useCampaignRecipientsPage(params: UseCampaignRecipientsPageParams) {
  const { supabase } = useAuth()
  const {
    organizationId,
    campaignId,
    page,
    pageSize,
    search,
    statuses,
  } = params

  return useQuery({
    queryKey: [
      "campaign-recipients",
      organizationId,
      campaignId,
      page,
      pageSize,
      search ?? "",
      statuses ?? [],
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!campaignId) throw new Error("campaignId is required")
      const [recipientsPage, statsRows] = await Promise.all([
        fetchCampaignRecipientsPage({
          supabase,
          organizationId,
          campaignId,
          page,
          pageSize,
          search,
          statuses,
        }),
        fetchCampaignDeliveryStats(supabase, organizationId, campaignId),
      ])
      const stats = statsRows[0] ?? {
        campaign_id: campaignId,
        recipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
      }
      return {
        recipients: recipientsPage.items,
        total: recipientsPage.total,
        stats,
      }
    },
    enabled: !!organizationId && !!campaignId,
  })
}

export function useCampaignRecipientEvents(
  organizationId: number | null,
  campaignId: number | null,
  recipientId: number | null
) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: [
      "campaign-recipient-events",
      organizationId,
      campaignId,
      recipientId,
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!campaignId) throw new Error("campaignId is required")
      if (!recipientId) throw new Error("recipientId is required")
      return fetchCampaignRecipientEvents(
        supabase,
        organizationId,
        campaignId,
        recipientId
      )
    },
    enabled: !!organizationId && !!campaignId && !!recipientId,
  })
}

export function useCampaignRecipientSentEmail(
  organizationId: number | null,
  campaignId: number | null,
  recipientId: number | null,
  providerRecipientId: string | null | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: [
      "campaign-recipient-sent-email",
      organizationId,
      campaignId,
      recipientId,
      providerRecipientId ?? "",
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!campaignId) throw new Error("campaignId is required")
      if (!recipientId) throw new Error("recipientId is required")

      const response = await fetch(
        `/api/organizations/${organizationId}/campaigns/${campaignId}/recipients/${recipientId}/sent-email`
      )
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        return null
      }
      const parsed = sentEmailResponseSchema.safeParse(body)
      if (!parsed.success) return null
      return parsed.data.email
    },
    enabled:
      enabled &&
      !!organizationId &&
      !!campaignId &&
      !!recipientId &&
      !!providerRecipientId?.trim(),
  })
}
