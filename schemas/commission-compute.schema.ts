import { z } from "zod"

/** Lead subset used by activate / preview commission compute. */
export const leadForCommissionSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  email: z.string(),
  full_name: z.string(),
  status: z.string(),
  enrollment_id: z.number().nullable(),
  organization_sale_id: z.number().nullable(),
  business_unit_id: z.number().nullable(),
  target_offer_id: z.number().nullable(),
  proposed_amount: z.number().nullable(),
  commissions_activated_at: z.string().nullable(),
  sale_source: z.enum(["platform", "manual"]).nullable(),
})

export type LeadForCommission = z.infer<typeof leadForCommissionSchema>

export const attributionRowSchema = z.object({
  id: z.number(),
  member_id: z.number(),
  attribution_type: z.enum(["closer", "setter", "ambassador", "business_unit"]),
  commission_rate: z.number().nullable(),
  commission_fixed: z.number().nullable(),
})

export type AttributionRow = z.infer<typeof attributionRowSchema>

export const memberDefaultsSchema = z.object({
  id: z.number(),
  default_commission_rate_sales: z.number().nullable(),
  default_commission_fixed_sales: z.number().nullable(),
  default_commission_rate_ambassador: z.number().nullable(),
  default_commission_fixed_ambassador: z.number().nullable(),
  default_commission_rate_coach: z.number().nullable(),
  default_commission_fixed_coach: z.number().nullable(),
})

export type MemberDefaults = z.infer<typeof memberDefaultsSchema>

export const businessUnitRowSchema = z.object({
  id: z.number(),
  owner_member_id: z.number().nullable(),
  default_commission_rate: z.number().nullable(),
  default_commission_fixed: z.number().nullable(),
})

export type BusinessUnitRow = z.infer<typeof businessUnitRowSchema>
