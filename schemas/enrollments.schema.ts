import { z } from "zod"

export const createManualEnrollmentSchema = z.object({
  offerId: z.number().int().positive(),
  buyerEmail: z.string().trim().email(),
  buyerName: z.string().trim().max(200).optional().nullable(),
  /** Amount in cents; defaults to offer.price when omitted */
  priceCents: z.number().int().nonnegative().optional().nullable(),
  /**
   * Access length in months from sale date.
   * `null` = lifetime. When omitted, falls back to offer.access_duration_months.
   */
  accessDurationMonths: z.number().int().positive().nullable().optional(),
  /** Business sale date `YYYY-MM-DD`. Defaults to today when omitted. */
  soldAt: z.string().optional(),
})

export type CreateManualEnrollmentInput = z.infer<typeof createManualEnrollmentSchema>

export const livingEnrollmentPreviewSchema = z.object({
  id: z.number().int().positive(),
  offerTitle: z.string(),
  status: z.string(),
  startedAt: z.string(),
  expiresAt: z.string().nullable(),
})

export const manualEnrollmentBuyerLookupSchema = z.object({
  userId: z.string().uuid().nullable(),
  fullName: z.string().nullable(),
  suggestedName: z.string().nullable(),
  /** Prior enrollments exist for this email in the org. */
  clientFound: z.boolean(),
  /** At least one org enrollment is already linked to a user account. */
  hasAccount: z.boolean(),
  livingEnrollments: z.array(livingEnrollmentPreviewSchema),
})

export type ManualEnrollmentBuyerLookup = z.infer<
  typeof manualEnrollmentBuyerLookupSchema
>
