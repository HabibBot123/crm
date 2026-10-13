import { z } from "zod"

export const buOwnerSettlementBasisSchema = z.enum(["of_revenue", "of_residual"])
export const buOwnerSettlementStatusSchema = z.enum(["pending", "paid"])

export const buOwnerSettlementSchema = z.object({
  id: z.coerce.number(),
  organization_id: z.coerce.number(),
  business_unit_id: z.coerce.number(),
  owner_member_id: z.coerce.number(),
  period_start: z.string(),
  period_end: z.string(),
  settlement_basis: buOwnerSettlementBasisSchema,
  commission_rate: z.coerce.number().nullable().optional().default(null),
  revenue_cents: z.coerce.number(),
  team_costs_cents: z.coerce.number(),
  basis_cents: z.coerce.number(),
  amount_cents: z.coerce.number(),
  status: buOwnerSettlementStatusSchema,
  due_at: z.string(),
  paid_at: z.string().nullable().optional().default(null),
  paid_by: z.coerce.number().nullable().optional().default(null),
  created_at: z.string(),
  business_unit_name: z.string().nullable().optional().default(null),
  owner_name: z.string().nullable().optional().default(null),
})

export const buOwnerSettlementOwnerSummarySchema = z.object({
  owner_member_id: z.number(),
  owner_name: z.string().nullable(),
  pending_count: z.number(),
  pending_cents: z.number(),
  overdue_count: z.number(),
  overdue_cents: z.number(),
  pending_ids: z.array(z.number()).default([]),
  overdue_ids: z.array(z.number()).default([]),
})

export type BuOwnerSettlement = z.infer<typeof buOwnerSettlementSchema>
export type BuOwnerSettlementBasis = z.infer<typeof buOwnerSettlementBasisSchema>
export type BuOwnerSettlementStatus = z.infer<typeof buOwnerSettlementStatusSchema>
export type BuOwnerSettlementOwnerSummary = z.infer<
  typeof buOwnerSettlementOwnerSummarySchema
>
