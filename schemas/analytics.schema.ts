import { z } from "zod"

export const analyticsRoleKindSchema = z.enum(["owner", "closer", "setter"])
export const analyticsViewerModeSchema = z.enum(["org", "head"])

export const analyticsKpisSchema = z.object({
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
  commissions_cents: z.coerce.number(),
  commissions_paid_cents: z.coerce.number(),
  margin_cents: z.coerce.number(),
  head_commissions_cents: z.coerce.number().default(0),
  head_commissions_paid_cents: z.coerce.number().default(0),
  team_commissions_cents: z.coerce.number().default(0),
  team_commissions_paid_cents: z.coerce.number().default(0),
})

export const analyticsRevenuePointSchema = z.object({
  day: z.string(),
  revenue_cents: z.coerce.number(),
})

export const analyticsCommissionPointSchema = z.object({
  bucket: z.string(),
  zone: z.enum(["history", "forecast"]),
  paid_cents: z.coerce.number(),
  forecast_cents: z.coerce.number(),
})

export const analyticsMemberRowSchema = z.object({
  member_id: z.coerce.number(),
  member_name: z.string(),
  role_kind: analyticsRoleKindSchema,
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
})

export const analyticsPackRowSchema = z.object({
  offer_id: z.coerce.number(),
  offer_title: z.string(),
  qty: z.coerce.number(),
  revenue_cents: z.coerce.number(),
  avg_price_cents: z.coerce.number(),
})

export const analyticsBusinessUnitRowSchema = z.object({
  business_unit_id: z.coerce.number(),
  name: z.string(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  revenue_cents: z.coerce.number(),
  commissions_cents: z.coerce.number(),
  commissions_paid_cents: z.coerce.number(),
  margin_cents: z.coerce.number(),
})

export const analyticsFunnelRowSchema = z.object({
  status_key: z.string(),
  label: z.string(),
  count: z.coerce.number(),
})

export const crmSalesAnalyticsSchema = z.object({
  viewer_mode: analyticsViewerModeSchema.default("org"),
  kpis: analyticsKpisSchema,
  revenue_series: z.array(analyticsRevenuePointSchema),
  commission_series: z.array(analyticsCommissionPointSchema),
  members: z.array(analyticsMemberRowSchema),
  packs: z.array(analyticsPackRowSchema),
  business_units: z.array(analyticsBusinessUnitRowSchema),
  funnel: z.array(analyticsFunnelRowSchema),
})

export type CrmSalesAnalytics = z.infer<typeof crmSalesAnalyticsSchema>
export type AnalyticsRoleKind = z.infer<typeof analyticsRoleKindSchema>
export type AnalyticsViewerMode = z.infer<typeof analyticsViewerModeSchema>

export const marketingAnalyticsKpisSchema = z.object({
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  lost: z.coerce.number().default(0),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
  clicks: z.coerce.number().default(0),
})

export const marketingLinkRowSchema = z.object({
  link_id: z.coerce.number(),
  label: z.string(),
  ref_code: z.string(),
  member_id: z.coerce.number(),
  member_name: z.string(),
  form_id: z.coerce.number(),
  form_title: z.string(),
  clicks: z.coerce.number(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
})

export const marketingAmbassadorRowSchema = z.object({
  member_id: z.coerce.number(),
  member_name: z.string(),
  links: z.coerce.number(),
  clicks: z.coerce.number(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
})

export const marketingFormRowSchema = z.object({
  form_id: z.coerce.number(),
  form_title: z.string(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
})

export const marketingChannelRowSchema = z.object({
  channel: z.string(),
  clicks: z.coerce.number(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
})

export const marketingLeadsPointSchema = z.object({
  day: z.string(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
})

export const crmMarketingAnalyticsSchema = z.object({
  kpis: marketingAnalyticsKpisSchema,
  leads_series: z.array(marketingLeadsPointSchema).default([]),
  revenue_series: z.array(analyticsRevenuePointSchema).default([]),
  links: z.array(marketingLinkRowSchema),
  ambassadors: z.array(marketingAmbassadorRowSchema),
  forms: z.array(marketingFormRowSchema),
  channels: z.array(marketingChannelRowSchema),
})

export type CrmMarketingAnalytics = z.infer<typeof crmMarketingAnalyticsSchema>

export const marketingCampaignAnalyticsKpisSchema = z.object({
  campaigns: z.coerce.number(),
  recipients: z.coerce.number(),
  sent: z.coerce.number(),
  delivered: z.coerce.number(),
  opened: z.coerce.number(),
  clicked: z.coerce.number(),
  bounced: z.coerce.number(),
  complained: z.coerce.number(),
  unsubscribed: z.coerce.number(),
  delivered_rate: z.coerce.number(),
  open_rate: z.coerce.number(),
  click_rate: z.coerce.number(),
  click_to_open_rate: z.coerce.number(),
  bounce_rate: z.coerce.number(),
  unsubscribe_rate: z.coerce.number(),
  complaint_rate: z.coerce.number(),
})

export const marketingCampaignAnalyticsRowSchema = z.object({
  campaign_id: z.coerce.number(),
  name: z.string(),
  from_name: z.string(),
  from_email: z.string(),
  subject: z.string(),
  sent_at: z.string().nullable(),
  recipients: z.coerce.number(),
  sent: z.coerce.number(),
  delivered: z.coerce.number(),
  non_delivered: z.coerce.number(),
  opened: z.coerce.number(),
  clicked: z.coerce.number(),
  bounced: z.coerce.number(),
  complained: z.coerce.number(),
  unsubscribed: z.coerce.number(),
  delivered_rate: z.coerce.number(),
  non_delivered_rate: z.coerce.number(),
  open_rate: z.coerce.number(),
  click_rate: z.coerce.number(),
  click_to_open_rate: z.coerce.number(),
  bounce_rate: z.coerce.number(),
  unsubscribe_rate: z.coerce.number(),
  complaint_rate: z.coerce.number(),
})

export const crmMarketingCampaignAnalyticsSchema = z.object({
  kpis: marketingCampaignAnalyticsKpisSchema,
  campaigns: z.array(marketingCampaignAnalyticsRowSchema),
})

export type CrmMarketingCampaignAnalytics = z.infer<
  typeof crmMarketingCampaignAnalyticsSchema
>
