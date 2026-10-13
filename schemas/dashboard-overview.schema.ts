import { z } from "zod"

export const overviewViewerModeSchema = z.enum(["member", "org", "bu"])
export type OverviewViewerMode = z.infer<typeof overviewViewerModeSchema>

export const overviewScopeSchema = z.enum(["org", "bu", "own"])

export const overviewKpisSchema = z.object({
  revenue_cents: z.coerce.number(),
  revenue_prev_cents: z.coerce.number(),
  leads: z.coerce.number(),
  leads_prev: z.coerce.number(),
  converted: z.coerce.number(),
  converted_prev: z.coerce.number(),
  active_clients: z.coerce.number(),
  my_leads: z.coerce.number(),
  my_leads_prev: z.coerce.number(),
  my_converted: z.coerce.number(),
  my_converted_prev: z.coerce.number(),
  commissions_earned_cents: z.coerce.number(),
  commissions_earned_prev_cents: z.coerce.number(),
  commissions_pending_cents: z.coerce.number(),
})

export const overviewAttentionSchema = z.object({
  unassigned_coaching: z.coerce.number(),
  leads_new: z.coerce.number(),
  payouts_overdue: z.coerce.number(),
  my_coaching_packs: z.coerce.number(),
  new_coaching_assignments: z.coerce.number().default(0),
})

export const overviewRecentSaleSchema = z.object({
  id: z.coerce.number(),
  created_at: z.string(),
  amount: z.coerce.number(),
  currency: z.string(),
  buyer_email: z.string().nullable().optional(),
  user_full_name: z.string().nullable().optional(),
  offer_title: z.string().nullable().optional(),
})

export const overviewTopProductSchema = z.object({
  product_id: z.coerce.number(),
  title: z.string(),
  type: z.string(),
  total_enrollments: z.coerce.number(),
})

export const overviewRecentLeadSchema = z.object({
  id: z.coerce.number(),
  full_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string(),
})

export const overviewAmbassadorLinkSchema = z.object({
  link_id: z.coerce.number(),
  label: z.string(),
  clicks: z.coerce.number(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
})

export const overviewTopFormSchema = z.object({
  form_id: z.coerce.number(),
  title: z.string(),
  leads: z.coerce.number(),
  converted: z.coerce.number(),
  clicks: z.coerce.number(),
})

export const overviewCoachingSchema = z.object({
  packs_active: z.coerce.number(),
  sessions_open: z.coerce.number(),
})

export const dashboardOverviewSchema = z.object({
  viewer_mode: overviewViewerModeSchema,
  scope: overviewScopeSchema,
  kpis: overviewKpisSchema,
  attention: overviewAttentionSchema,
  recent_sales: z.array(overviewRecentSaleSchema).default([]),
  top_products: z.array(overviewTopProductSchema).default([]),
  recent_leads: z.array(overviewRecentLeadSchema).default([]),
  top_forms: z.array(overviewTopFormSchema).default([]),
  ambassador_links: z.array(overviewAmbassadorLinkSchema).default([]),
  coaching: overviewCoachingSchema.nullable().optional(),
})

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>
