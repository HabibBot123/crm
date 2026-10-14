import { z } from "zod"

export const campaignEmailTemplateSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  subject: z.string(),
  body_json: z.unknown(),
  body_html: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type CampaignEmailTemplate = z.infer<typeof campaignEmailTemplateSchema>

export const createCampaignEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(300).default(""),
  body_json: z.unknown().optional(),
  body_html: z.string().optional(),
})

export type CreateCampaignEmailTemplateInput = z.infer<
  typeof createCampaignEmailTemplateSchema
>

export const updateCampaignEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().max(300).optional(),
  body_json: z.unknown().optional(),
  body_html: z.string().optional(),
})

export type UpdateCampaignEmailTemplateInput = z.infer<
  typeof updateCampaignEmailTemplateSchema
>

/** Broadcast personalization tokens (V1). Unsubscribe = CoachStack page. */
export const CAMPAIGN_EMAIL_VARIABLES = [
  { key: "FIRST_NAME", label: "First name", defaultFallback: "there" },
  { key: "LAST_NAME", label: "Last name", defaultFallback: "" },
  { key: "EMAIL", label: "Email", defaultFallback: "" },
  { key: "UNSUBSCRIBE_URL", label: "Unsubscribe link", defaultFallback: "" },
] as const

export const UNSUBSCRIBE_TOKEN = "{{{UNSUBSCRIBE_URL}}}"

/** Default body for new templates / campaigns without a template. */
export const DEFAULT_CAMPAIGN_EMAIL_BODY_HTML = `<p>Hi <span data-campaign-variable="FIRST_NAME" data-fallback="there" class="campaign-email-var" contenteditable="false">First name</span>,</p>
<p>Write your message here.</p>
<p><a href="${UNSUBSCRIBE_TOKEN}" class="campaign-email-var-link">Unsubscribe</a></p>`

export function buildCampaignVariableToken(
  key: string,
  fallback: string
): string {
  if (key === "UNSUBSCRIBE_URL") return `{{{UNSUBSCRIBE_URL}}}`
  return `{{{${key}|${fallback}}}}`
}

export function htmlHasUnsubscribeLink(html: string): boolean {
  return html.includes("UNSUBSCRIBE_URL") || html.includes("cs_unsub_")
}

export function substituteCampaignVariables(
  html: string,
  values: {
    firstName?: string
    lastName?: string
    email?: string
    unsubscribeUrl?: string
  }
): string {
  return html
    .replace(/\{\{\{FIRST_NAME\|([^}]*)\}\}\}/g, (_match, fallback: string) =>
      values.firstName ? values.firstName : fallback
    )
    .replace(/\{\{\{LAST_NAME\|([^}]*)\}\}\}/g, (_match, fallback: string) =>
      values.lastName ? values.lastName : fallback
    )
    .replace(/\{\{\{EMAIL\|([^}]*)\}\}\}/g, (_match, fallback: string) =>
      values.email ? values.email : fallback
    )
    .replace(
      /\{\{\{UNSUBSCRIBE_URL\}\}\}/g,
      values.unsubscribeUrl ?? "https://example.com/unsubscribe"
    )
}
