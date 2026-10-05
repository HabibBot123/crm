import { z } from "zod"

export const createManualEnrollmentSchema = z.object({
  offerId: z.number().int().positive(),
  buyerEmail: z.string().trim().email(),
  buyerName: z.string().trim().max(200).optional().nullable(),
  /** Amount in cents; defaults to offer.price when omitted */
  priceCents: z.number().int().nonnegative().optional().nullable(),
  /**
   * Access length in months from today.
   * `null` = lifetime. When omitted, falls back to offer.access_duration_months.
   */
  accessDurationMonths: z.number().int().positive().nullable().optional(),
})

export type CreateManualEnrollmentInput = z.infer<typeof createManualEnrollmentSchema>
