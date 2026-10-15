import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchCampaignDeliveryStats } from "@/lib/services/campaign-delivery"
import {
  crmMarketingAnalyticsSchema,
  crmMarketingCampaignAnalyticsSchema,
  crmSalesAnalyticsSchema,
  type AnalyticsViewerMode,
  type CrmMarketingAnalytics,
  type CrmMarketingCampaignAnalytics,
  type CrmSalesAnalytics,
} from "@/schemas/analytics.schema"

export type AnalyticsPreset = "7d" | "30d" | "month" | "quarter" | "year" | "custom"

export type FetchCrmSalesAnalyticsParams = {
  organizationId: number
  from: string
  to: string
  businessUnitId?: number | null
  preset?: AnalyticsPreset
  viewerMode?: AnalyticsViewerMode | null
}

export type FetchCrmMarketingAnalyticsParams = {
  organizationId: number
  from: string
  to: string
  businessUnitId?: number | null
}

export async function fetchCrmSalesAnalytics(
  supabase: SupabaseClient,
  params: FetchCrmSalesAnalyticsParams
): Promise<CrmSalesAnalytics> {
  const { data, error } = await supabase.rpc("crm_sales_analytics", {
    p_organization_id: params.organizationId,
    p_from: `${params.from}T00:00:00.000Z`,
    p_to: `${params.to}T23:59:59.999Z`,
    p_business_unit_id: params.businessUnitId ?? null,
    p_preset: params.preset ?? "custom",
    p_viewer_mode: params.viewerMode ?? null,
  })
  if (error) throw error
  return crmSalesAnalyticsSchema.parse(data)
}

export async function fetchCrmMarketingAnalytics(
  supabase: SupabaseClient,
  params: FetchCrmMarketingAnalyticsParams
): Promise<CrmMarketingAnalytics> {
  const { data, error } = await supabase.rpc("crm_marketing_analytics", {
    p_organization_id: params.organizationId,
    p_from: `${params.from}T00:00:00.000Z`,
    p_to: `${params.to}T23:59:59.999Z`,
    p_business_unit_id: params.businessUnitId ?? null,
  })
  if (error) throw error
  return crmMarketingAnalyticsSchema.parse(data)
}

export type FetchCrmMarketingCampaignAnalyticsParams = {
  organizationId: number
  from: string
  to: string
}

function deliveryRate(count: number, base: number): number {
  if (base <= 0) return 0
  return Math.round((count / base) * 1000) / 10
}

export async function fetchCrmMarketingCampaignAnalytics(
  supabase: SupabaseClient,
  params: FetchCrmMarketingCampaignAnalyticsParams
): Promise<CrmMarketingCampaignAnalytics> {
  const fromIso = `${params.from}T00:00:00.000Z`
  const toIso = `${params.to}T23:59:59.999Z`

  const { data: campaignRows, error } = await supabase
    .from("campaigns")
    .select(
      "id, name, sent_at, from_name, from_email, subject, snapshot_subject"
    )
    .eq("organization_id", params.organizationId)
    .in("status", ["sent", "sending"])
    .not("sent_at", "is", null)
    .gte("sent_at", fromIso)
    .lte("sent_at", toIso)
    .order("sent_at", { ascending: false })

  if (error) throw error

  const statsRows = await fetchCampaignDeliveryStats(
    supabase,
    params.organizationId,
    null
  )
  const statsById = new Map(
    statsRows.map((row) => [row.campaign_id, row])
  )

  const campaigns = (campaignRows ?? []).map((row) => {
    const stats = statsById.get(row.id)
    const recipients = stats?.recipients ?? 0
    const sent = stats?.sent ?? 0
    const delivered = stats?.delivered ?? 0
    const opened = stats?.opened ?? 0
    const clicked = stats?.clicked ?? 0
    const bounced = stats?.bounced ?? 0
    const complained = stats?.complained ?? 0
    const unsubscribed = stats?.unsubscribed ?? 0
    const nonDelivered = Math.max(sent - delivered, 0)
    const subject =
      (typeof row.snapshot_subject === "string" &&
      row.snapshot_subject.trim().length > 0
        ? row.snapshot_subject
        : null) ??
      (typeof row.subject === "string" ? row.subject : "")
    return {
      campaign_id: row.id,
      name: row.name,
      from_name: row.from_name ?? "",
      from_email: row.from_email ?? "",
      subject,
      sent_at: row.sent_at,
      recipients,
      sent,
      delivered,
      non_delivered: nonDelivered,
      opened,
      clicked,
      bounced,
      complained,
      unsubscribed,
      delivered_rate: deliveryRate(delivered, sent),
      non_delivered_rate: deliveryRate(nonDelivered, sent),
      open_rate: deliveryRate(opened, delivered),
      click_rate: deliveryRate(clicked, delivered),
      click_to_open_rate: deliveryRate(clicked, opened),
      bounce_rate: deliveryRate(bounced, sent),
      unsubscribe_rate: deliveryRate(unsubscribed, delivered),
      complaint_rate: deliveryRate(complained, delivered),
    }
  })

  const totals = campaigns.reduce(
    (acc, row) => {
      acc.recipients += row.recipients
      acc.sent += row.sent
      acc.delivered += row.delivered
      acc.opened += row.opened
      acc.clicked += row.clicked
      acc.bounced += row.bounced
      acc.complained += row.complained
      acc.unsubscribed += row.unsubscribed
      return acc
    },
    {
      recipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0,
    }
  )

  return crmMarketingCampaignAnalyticsSchema.parse({
    kpis: {
      campaigns: campaigns.length,
      recipients: totals.recipients,
      sent: totals.sent,
      delivered: totals.delivered,
      opened: totals.opened,
      clicked: totals.clicked,
      bounced: totals.bounced,
      complained: totals.complained,
      unsubscribed: totals.unsubscribed,
      delivered_rate: deliveryRate(totals.delivered, totals.sent),
      open_rate: deliveryRate(totals.opened, totals.delivered),
      click_rate: deliveryRate(totals.clicked, totals.delivered),
      click_to_open_rate: deliveryRate(totals.clicked, totals.opened),
      bounce_rate: deliveryRate(totals.bounced, totals.sent),
      unsubscribe_rate: deliveryRate(totals.unsubscribed, totals.delivered),
      complaint_rate: deliveryRate(totals.complained, totals.delivered),
    },
    campaigns,
  })
}
