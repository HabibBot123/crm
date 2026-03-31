import { z } from "zod"

const metadataSchema = z.record(z.string()).optional()

export const checkoutSessionCompletedSchema = z.object({
  id: z.string(),
  amount_total: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  metadata: metadataSchema,
  customer: z.string().nullable().optional(),
  customer_details: z
    .object({
      email: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  subscription: z.string().nullable().optional(),
  payment_intent: z.string().nullable().optional(),
})

export const subscriptionCreatedSchema = z.object({
  id: z.string(),
  metadata: metadataSchema,
  start_date: z.number().optional(),
})

export const subscriptionUpdatedSchema = z.object({
  id: z.string(),
  status: z.string(),
})

export const subscriptionDeletedSchema = z.object({
  id: z.string(),
  metadata: metadataSchema,
  start_date: z.number().optional(),
  ended_at: z.number().nullable().optional(),
  cancel_at: z.number().nullable().optional(),
  current_period_end: z.number().optional(),
})

export const invoicePaidSchema = z.object({
  id: z.string(),
  customer: z.string().nullable().optional(),
  subscription: z.string().nullable().optional(),
  parent: z
    .object({
      subscription_details: z
        .object({
          subscription: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  amount_paid: z.number().optional(),
  currency: z.string().nullable().optional(),
  billing_reason: z.string().optional(),
  invoice_pdf: z.string().nullable().optional(),
  created: z.number().optional(),
})

export const invoicePaymentFailedSchema = z.object({
  id: z.string(),
  subscription: z.string().nullable().optional(),
})
