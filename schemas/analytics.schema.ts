import { z } from "zod"

export const analyticsRoleKindSchema = z.enum(["owner", "closer", "setter"])

export const analyticsKpisSchema = z.object({
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  conversion_rate: z.coerce.number(),
  revenue_cents: z.coerce.number(),
  commissions_cents: z.coerce.number(),
  commissions_paid_cents: z.coerce.number(),
  margin_cents: z.coerce.number(),
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
