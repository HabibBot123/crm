import { z } from "zod"

export const campaignStatusSchema = z.enum([
  "draft",
  "scheduled",
  "sending",
  "sent",
  "canceled",
])

export type CampaignStatus = z.infer<typeof campaignStatusSchema>

export const marketingCampaignSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  segment_id: z.number().int().positive(),
  template_id: z.number().int().positive().nullable(),
  subject: z.string().min(1),
  body_html: z.string(),
  body_json: z.unknown(),
  preview_text: z.string().nullable(),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  reply_to: z.string().email().nullable(),
  status: campaignStatusSchema,
  scheduled_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  resend_broadcast_id: z.string().nullable(),
  snapshot_html: z.string().nullable(),
  snapshot_text: z.string().nullable(),
  snapshot_subject: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type MarketingCampaign = z.infer<typeof marketingCampaignSchema>

export const createMarketingCampaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  segment_id: z.number().int().positive(),
  template_id: z.number().int().positive().nullable().optional(),
  subject: z.string().trim().min(1).max(300),
  body_html: z.string().optional(),
  body_json: z.unknown().optional(),
  preview_text: z.string().trim().max(200).nullable().optional(),
  from_name: z.string().trim().min(1).max(120),
  from_email: z.string().trim().email(),
  reply_to: z.string().trim().email().nullable().optional(),
})

export type CreateMarketingCampaignInput = z.infer<
  typeof createMarketingCampaignSchema
>

export const updateMarketingCampaignSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  segment_id: z.number().int().positive().optional(),
  template_id: z.number().int().positive().nullable().optional(),
  subject: z.string().trim().min(1).max(300).optional(),
  body_html: z.string().optional(),
  body_json: z.unknown().optional(),
  preview_text: z.string().trim().max(200).nullable().optional(),
  from_name: z.string().trim().min(1).max(120).optional(),
  from_email: z.string().trim().email().optional(),
  reply_to: z.string().trim().email().nullable().optional(),
})

export type UpdateMarketingCampaignInput = z.infer<
  typeof updateMarketingCampaignSchema
>

export const sendMarketingCampaignSchema = z.object({
  scheduled_at: z.string().datetime().nullable().optional(),
})

export type SendMarketingCampaignInput = z.infer<
  typeof sendMarketingCampaignSchema
>

export const testSendMarketingCampaignSchema = z.object({
  to: z.string().trim().email(),
})

export type TestSendMarketingCampaignInput = z.infer<
  typeof testSendMarketingCampaignSchema
>
