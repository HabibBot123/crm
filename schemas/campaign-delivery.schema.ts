import { z } from "zod"

export const campaignRecipientStatusSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "delivery_delayed",
  "failed",
  "suppressed",
  "unsubscribed",
])

export type CampaignRecipientStatus = z.infer<
  typeof campaignRecipientStatusSchema
>

export const campaignEmailEventTypeSchema = z.enum([
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "delivery_delayed",
  "failed",
  "suppressed",
  "unsubscribed",
])

export type CampaignEmailEventType = z.infer<
  typeof campaignEmailEventTypeSchema
>

export const campaignRecipientSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  campaign_id: z.number().int().positive(),
  campaign_contact_id: z.number().int().positive().nullable(),
  email: z.string().min(1),
  provider_recipient_id: z.string().nullable(),
  last_status: campaignRecipientStatusSchema,
  last_status_at: z.string(),
  sent_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  opened_at: z.string().nullable(),
  clicked_at: z.string().nullable(),
  bounced_at: z.string().nullable(),
  complained_at: z.string().nullable(),
  unsubscribed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type CampaignRecipient = z.infer<typeof campaignRecipientSchema>

export const campaignEmailEventSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  campaign_id: z.number().int().positive(),
  recipient_id: z.number().int().positive(),
  event_type: campaignEmailEventTypeSchema,
  occurred_at: z.string(),
  provider_event_id: z.string().min(1),
  meta: z.record(z.string(), z.unknown()),
  created_at: z.string(),
})

export type CampaignEmailEvent = z.infer<typeof campaignEmailEventSchema>

export const campaignDeliveryStatsSchema = z.object({
  campaign_id: z.number().int().positive(),
  recipients: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  bounced: z.number().int().nonnegative(),
  complained: z.number().int().nonnegative(),
  unsubscribed: z.number().int().nonnegative(),
})

export type CampaignDeliveryStats = z.infer<typeof campaignDeliveryStatsSchema>

export const campaignRecipientListItemSchema = campaignRecipientSchema.extend({
  full_name: z.string().nullable().optional(),
  lead_id: z.number().int().positive().nullable().optional(),
})

export type CampaignRecipientListItem = z.infer<
  typeof campaignRecipientListItemSchema
>

export const campaignRecipientSentEmailSchema = z.object({
  subject: z.string().nullable(),
  html: z.string().nullable(),
  text: z.string().nullable(),
})

export type CampaignRecipientSentEmail = z.infer<
  typeof campaignRecipientSentEmailSchema
>
