import type { SupabaseClient } from "@supabase/supabase-js"
import {
  campaignEmailTemplateSchema,
  createCampaignEmailTemplateSchema,
  updateCampaignEmailTemplateSchema,
  type CampaignEmailTemplate,
  type CreateCampaignEmailTemplateInput,
  type UpdateCampaignEmailTemplateInput,
} from "@/schemas/campaign-email-template.schema"

function mapTemplate(row: Record<string, unknown>): CampaignEmailTemplate {
  return campaignEmailTemplateSchema.parse(row)
}

export async function fetchCampaignEmailTemplates(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CampaignEmailTemplate[]> {
  const { data, error } = await supabase
    .from("campaign_email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapTemplate(row))
}

export async function fetchCampaignEmailTemplate(
  supabase: SupabaseClient,
  organizationId: number,
  templateId: number
): Promise<CampaignEmailTemplate | null> {
  const { data, error } = await supabase
    .from("campaign_email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapTemplate(data)
}

export async function createCampaignEmailTemplate(
  supabase: SupabaseClient,
  organizationId: number,
  input: CreateCampaignEmailTemplateInput
): Promise<CampaignEmailTemplate> {
  const parsed = createCampaignEmailTemplateSchema.parse(input)
  const { data, error } = await supabase
    .from("campaign_email_templates")
    .insert({
      organization_id: organizationId,
      name: parsed.name,
      subject: parsed.subject,
      body_json: parsed.body_json ?? {},
      body_html: parsed.body_html ?? "",
    })
    .select("*")
    .single()
  if (error) throw error
  return mapTemplate(data)
}

export async function updateCampaignEmailTemplate(
  supabase: SupabaseClient,
  organizationId: number,
  templateId: number,
  input: UpdateCampaignEmailTemplateInput
): Promise<CampaignEmailTemplate> {
  const parsed = updateCampaignEmailTemplateSchema.parse(input)
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.name != null) patch.name = parsed.name
  if (parsed.subject != null) patch.subject = parsed.subject
  if (parsed.body_json !== undefined) patch.body_json = parsed.body_json
  if (parsed.body_html != null) patch.body_html = parsed.body_html

  const { data, error } = await supabase
    .from("campaign_email_templates")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .select("*")
    .single()
  if (error) throw error
  return mapTemplate(data)
}

export async function deleteCampaignEmailTemplate(
  supabase: SupabaseClient,
  organizationId: number,
  templateId: number
): Promise<void> {
  const { error } = await supabase
    .from("campaign_email_templates")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", templateId)
  if (error) throw error
}
