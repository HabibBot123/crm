import { z } from "zod"

/** Lead columns needed when recording / linking a sale. */
export const leadSaleRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  email: z.string(),
  full_name: z.string(),
  status: z.string(),
  enrollment_id: z.number().nullable(),
  organization_sale_id: z.number().nullable().optional(),
  commissions_activated_at: z.string().nullable(),
})

export type LeadSaleRow = z.infer<typeof leadSaleRowSchema>

/** Enrollment columns used to create / link an organization_sale. */
export const enrollmentLinkSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  offer_id: z.number().nullable(),
  buyer_email: z.string().nullable(),
  user_id: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
})

export type EnrollmentLink = z.infer<typeof enrollmentLinkSchema>
