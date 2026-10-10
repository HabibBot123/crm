import { z } from "zod"

export const salePaymentKindSchema = z.enum(["subscription", "installment", "direct"])
export const saleSourceFilterSchema = z.enum(["manual", "stripe"])

export type SalePaymentKind = z.infer<typeof salePaymentKindSchema>
export type SaleSourceFilter = z.infer<typeof saleSourceFilterSchema>

/** Raw row from `v_organization_sales`. */
export const saleListRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  enrollment_id: z.number().nullable(),
  buyer_email: z.string().nullable(),
  billing_type: z.string(),
  price: z.number(),
  currency: z.string(),
  source: z.string(),
  created_at: z.string(),
  sold_at: z.string(),
  base_amount_cents: z.number().nullable().optional().default(null),
  installment_index: z.number().nullable().optional().default(null),
  installment_count: z.number().nullable().optional().default(null),
  offer_title: z.string().nullable().optional().default(null),
  lead_id: z.number().nullable().optional().default(null),
  lead_name: z.string().nullable().optional().default(null),
  commissions_activated_at: z.string().nullable().optional().default(null),
  // bigint subqueries may arrive as number or string via PostgREST
  commissions_total_cents: z.coerce.number().optional().default(0),
  commissions_pending_cents: z.coerce.number().optional().default(0),
  offer_id: z.number().nullable().optional().default(null),
  payment_kind: salePaymentKindSchema.optional().default("direct"),
})

export type SaleListRow = z.infer<typeof saleListRowSchema>

/** Mapped sale list item used by the Sales UI / sheet. */
export type OrganizationSaleListItem = {
  id: number
  organization_id: number
  enrollment_id: number | null
  buyer_email: string | null
  billing_type: string
  price_cents: number
  currency: string
  source: string
  created_at: string
  sold_at: string
  base_amount_cents: number | null
  installment_index: number | null
  installment_count: number | null
  offer_title: string | null
  lead_id: number | null
  lead_name: string | null
  commissions_activated_at: string | null
  commissions_total_cents: number
  commissions_pending_cents: number
  offer_id: number | null
  payment_kind: SalePaymentKind
}

export type OrganizationSalesFilters = {
  page: number
  pageSize: number
  search?: string
  paymentKinds?: SalePaymentKind[]
  sources?: SaleSourceFilter[]
  offerIds?: number[]
  /** Inclusive, in cents. */
  amountMinCents?: number
  /** Inclusive, in cents. */
  amountMaxCents?: number
}
