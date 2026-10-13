import { z } from "zod"

export const campaignTopicSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  resend_topic_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const campaignContactSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  email: z.string().email(),
  marketing_opt_in: z.boolean(),
  opted_in_at: z.string().nullable(),
  opted_out_at: z.string().nullable(),
  lead_id: z.number().int().positive().nullable(),
  enrollment_id: z.number().int().positive().nullable(),
  resend_contact_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type CampaignTopic = z.infer<typeof campaignTopicSchema>
export type CampaignContact = z.infer<typeof campaignContactSchema>

export const MARKETING_CONSENT_LABEL =
  "I agree that {orgName} may keep my contact details to get in touch with me."

export function marketingConsentLabel(orgName: string): string {
  const name = orgName.trim().length > 0 ? orgName.trim() : "this organization"
  return MARKETING_CONSENT_LABEL.replace("{orgName}", name)
}
