import type { SupabaseClient } from "@supabase/supabase-js"
import { getResendClient } from "@/lib/resend"
import { injectOrgScopedMergeTags } from "@/lib/campaigns/contact-properties"
import {
  injectUnsubscribeMergeUrl,
  buildUnsubscribePageUrl,
  createUnsubscribeToken,
} from "@/lib/campaigns/unsubscribe"
import {
  attachResendCampaignTopic,
  ensureUnsubscribeContactProperty,
  syncDirtySegmentContactsToResend,
  syncOrgCampaignContactsToResend,
} from "@/lib/services/campaign-contacts"
import {
  clearCampaignRecipients,
  materializeCampaignRecipients,
} from "@/lib/services/campaign-delivery"
import {
  fetchCampaignSegment,
  reconcileCampaignSegmentMembership,
  resolveCampaignSegmentContacts,
} from "@/lib/services/campaign-segments"
import { fetchCampaignEmailTemplate } from "@/lib/services/campaign-email-templates"
import { fetchSendingDomain } from "@/lib/services/sending-domains"
import {
  htmlHasUnsubscribeLink,
  substituteCampaignVariables,
} from "@/schemas/campaign-email-template.schema"
import {
  createMarketingCampaignSchema,
  marketingCampaignSchema,
  sendMarketingCampaignSchema,
  testSendMarketingCampaignSchema,
  updateMarketingCampaignSchema,
  type CampaignStatus,
  type CreateMarketingCampaignInput,
  type MarketingCampaign,
  type SendMarketingCampaignInput,
  type TestSendMarketingCampaignInput,
  type UpdateMarketingCampaignInput,
} from "@/schemas/marketing-campaign.schema"

function mapCampaign(row: Record<string, unknown>): MarketingCampaign {
  return marketingCampaignSchema.parse(row)
}

function formatFrom(fromName: string, fromEmail: string): string {
  const name = fromName.trim()
  const email = fromEmail.trim().toLowerCase()
  if (!name) return email
  return `${name} <${email}>`
}

function plainTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function fetchMarketingCampaigns(
  supabase: SupabaseClient,
  organizationId: number
): Promise<MarketingCampaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => mapCampaign(row))
}

export type FetchMarketingCampaignsPageParams = {
  supabase: SupabaseClient
  organizationId: number
  page: number
  pageSize: number
  search?: string
  statuses?: CampaignStatus[]
}

export type MarketingCampaignsPage = {
  items: MarketingCampaign[]
  total: number
}

export async function fetchMarketingCampaignsPage(
  params: FetchMarketingCampaignsPageParams
): Promise<MarketingCampaignsPage> {
  const { supabase, organizationId, page, pageSize, search, statuses } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to)

  const term = search?.trim()
  if (term) {
    const q = term
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/'/g, "''")
    query = query.or(`name.ilike.%${q}%,subject.ilike.%${q}%`)
  }
  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    items: (data ?? []).map((row) => mapCampaign(row)),
    total: count ?? 0,
  }
}

export async function fetchMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<MarketingCampaign | null> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapCampaign(data)
}

export async function createMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  input: CreateMarketingCampaignInput
): Promise<MarketingCampaign> {
  const parsed = createMarketingCampaignSchema.parse(input)
  const segment = await fetchCampaignSegment(
    supabase,
    organizationId,
    parsed.segment_id
  )
  if (!segment) throw new Error("Segment not found")

  let bodyHtml = parsed.body_html ?? ""
  let bodyJson: unknown = parsed.body_json ?? {}

  if (parsed.template_id != null) {
    const template = await fetchCampaignEmailTemplate(
      supabase,
      organizationId,
      parsed.template_id
    )
    if (!template) throw new Error("Template not found")
    if (!bodyHtml.trim()) {
      bodyHtml = template.body_html
      bodyJson = template.body_json
    }
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      organization_id: organizationId,
      name: parsed.name,
      segment_id: parsed.segment_id,
      template_id: parsed.template_id ?? null,
      subject: parsed.subject,
      body_html: bodyHtml,
      body_json: bodyJson,
      preview_text: parsed.preview_text ?? null,
      from_name: parsed.from_name,
      from_email: parsed.from_email.toLowerCase(),
      reply_to: parsed.reply_to ? parsed.reply_to.toLowerCase() : null,
      status: "draft",
    })
    .select("*")
    .single()
  if (error) throw error
  return mapCampaign(data)
}

export async function duplicateMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<MarketingCampaign> {
  const source = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!source) throw new Error("Campaign not found")

  const copyName = `Copy of ${source.name}`.slice(0, 120)
  return createMarketingCampaign(supabase, organizationId, {
    name: copyName,
    segment_id: source.segment_id,
    template_id: source.template_id,
    subject: source.subject,
    body_html: source.body_html,
    body_json: source.body_json,
    preview_text: source.preview_text,
    from_name: source.from_name,
    from_email: source.from_email,
    reply_to: source.reply_to,
  })
}

export async function updateMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  input: UpdateMarketingCampaignInput
): Promise<MarketingCampaign> {
  const existing = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!existing) throw new Error("Campaign not found")
  if (existing.status !== "draft" && existing.status !== "canceled") {
    throw new Error("Only draft or canceled campaigns can be edited")
  }

  const parsed = updateMarketingCampaignSchema.parse(input)
  if (parsed.segment_id != null) {
    const segment = await fetchCampaignSegment(
      supabase,
      organizationId,
      parsed.segment_id
    )
    if (!segment) throw new Error("Segment not found")
  }
  if (parsed.template_id != null) {
    const template = await fetchCampaignEmailTemplate(
      supabase,
      organizationId,
      parsed.template_id
    )
    if (!template) throw new Error("Template not found")
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.name != null) patch.name = parsed.name
  if (parsed.segment_id != null) patch.segment_id = parsed.segment_id
  if (parsed.template_id !== undefined) patch.template_id = parsed.template_id
  if (parsed.subject != null) patch.subject = parsed.subject
  if (parsed.body_html != null) patch.body_html = parsed.body_html
  if (parsed.body_json !== undefined) patch.body_json = parsed.body_json
  if (parsed.preview_text !== undefined) patch.preview_text = parsed.preview_text
  if (parsed.from_name != null) patch.from_name = parsed.from_name
  if (parsed.from_email != null) patch.from_email = parsed.from_email.toLowerCase()
  if (parsed.reply_to !== undefined) {
    patch.reply_to = parsed.reply_to ? parsed.reply_to.toLowerCase() : null
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .select("*")
    .single()
  if (error) throw error
  return mapCampaign(data)
}

export async function deleteMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<void> {
  const existing = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!existing) return
  if (existing.status === "sent" || existing.status === "sending") {
    throw new Error("Sent campaigns cannot be deleted")
  }

  if (existing.resend_broadcast_id && existing.status === "scheduled") {
    const resend = getResendClient()
    if (resend) {
      // Delete scheduled broadcast on Resend (also stops delivery).
      await resend.broadcasts.remove(existing.resend_broadcast_id)
    }
  }

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
  if (error) throw error
}

async function resolveCampaignHtml(
  supabase: SupabaseClient,
  organizationId: number,
  campaign: MarketingCampaign
): Promise<{ html: string; text: string; subject: string }> {
  // Prefer live campaign body (template copy / override). Snapshots only after send.
  let html = campaign.body_html.trim()
    ? campaign.body_html
    : (campaign.snapshot_html ?? "")
  let subject = campaign.subject.trim()
    ? campaign.subject
    : (campaign.snapshot_subject ?? "")

  if (!html.trim() && campaign.template_id != null) {
    const template = await fetchCampaignEmailTemplate(
      supabase,
      organizationId,
      campaign.template_id
    )
    if (!template || !template.body_html.trim()) {
      throw new Error("Template has no email body")
    }
    html = template.body_html
    if (!subject.trim() && template.subject.trim()) {
      subject = template.subject
    }
  }

  if (!html.trim()) {
    throw new Error("Campaign has no email body")
  }
  if (!htmlHasUnsubscribeLink(html)) {
    throw new Error("Email body must include the unsubscribe variable")
  }
  if (!subject.trim()) {
    throw new Error("Campaign has no subject")
  }

  const text = plainTextFromHtml(html)
  return { html, text, subject }
}

export async function previewMarketingCampaignAudience(
  supabase: SupabaseClient,
  organizationId: number,
  segmentId: number
): Promise<{ total: number; synced: number }> {
  const segment = await fetchCampaignSegment(supabase, organizationId, segmentId)
  if (!segment) throw new Error("Segment not found")
  const contacts = await resolveCampaignSegmentContacts(
    supabase,
    organizationId,
    segment.filter_json
  )
  const synced = contacts.filter((c) => c.resend_contact_id != null).length
  return { total: contacts.length, synced }
}

export async function sendTestMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  input: TestSendMarketingCampaignInput
): Promise<{ ok: true }> {
  const parsed = testSendMarketingCampaignSchema.parse(input)
  const campaign = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!campaign) throw new Error("Campaign not found")

  const domain = await fetchSendingDomain(supabase, organizationId)
  if (!domain || domain.status !== "verified") {
    throw new Error("Verify your sending domain before sending a test")
  }

  const { html, subject } = await resolveCampaignHtml(
    supabase,
    organizationId,
    campaign
  )
  const unsubscribeUrl = buildUnsubscribePageUrl(
    createUnsubscribeToken({
      organizationId,
      email: parsed.to,
    }),
    campaignId
  )
  const renderedHtml = substituteCampaignVariables(html, {
    firstName: "Alex",
    lastName: "Doe",
    email: parsed.to,
    unsubscribeUrl,
  })
  const renderedSubject = substituteCampaignVariables(subject, {
    firstName: "Alex",
    lastName: "Doe",
    email: parsed.to,
  })

  const resend = getResendClient()
  if (!resend) throw new Error("Email provider is not configured")
  await ensureUnsubscribeContactProperty(resend, organizationId)

  const { error } = await resend.emails.send({
    from: formatFrom(campaign.from_name, campaign.from_email),
    to: parsed.to,
    subject: `[Test] ${renderedSubject}`,
    html: renderedHtml,
    ...(campaign.reply_to ? { replyTo: campaign.reply_to } : {}),
  })
  if (error) throw new Error(error.message)
  return { ok: true }
}

/**
 * Sync audience, reconcile segment, create Resend broadcast, send or schedule.
 */
export async function sendMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  input?: SendMarketingCampaignInput
): Promise<MarketingCampaign> {
  const parsed = sendMarketingCampaignSchema.parse(input ?? {})
  const campaign = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status !== "draft" && campaign.status !== "canceled") {
    throw new Error("Only draft or canceled campaigns can be sent")
  }

  const domain = await fetchSendingDomain(supabase, organizationId)
  if (!domain || domain.status !== "verified") {
    throw new Error("Verify your sending domain before sending")
  }

  const resolved = await resolveCampaignHtml(
    supabase,
    organizationId,
    campaign
  )
  const html = injectUnsubscribeMergeUrl(
    injectOrgScopedMergeTags(resolved.html, organizationId),
    organizationId,
    campaignId
  )
  const text = plainTextFromHtml(html)
  const subject = injectOrgScopedMergeTags(resolved.subject, organizationId)

  await syncOrgCampaignContactsToResend(supabase, organizationId)

  const segment = await fetchCampaignSegment(
    supabase,
    organizationId,
    campaign.segment_id
  )
  if (!segment) throw new Error("Segment not found")

  await syncDirtySegmentContactsToResend(
    supabase,
    organizationId,
    segment.filter_json
  )

  const reconcile = await reconcileCampaignSegmentMembership(
    supabase,
    organizationId,
    campaign.segment_id
  )
  if (reconcile.matched === 0) {
    throw new Error("Segment has no matching contacts")
  }
  if (!segment.resend_segment_id) {
    throw new Error("Segment is not ready on the email provider")
  }

  const topic = await attachResendCampaignTopic(supabase, organizationId)
  if (!topic?.resend_topic_id) {
    throw new Error("Marketing topic is not ready")
  }

  const resend = getResendClient()
  if (!resend) throw new Error("Email provider is not configured")
  await ensureUnsubscribeContactProperty(resend, organizationId)

  const { data: locking, error: lockError } = await supabase
    .from("campaigns")
    .update({
      status: "sending",
      snapshot_html: html,
      snapshot_text: text,
      snapshot_subject: subject,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .in("status", ["draft", "canceled"])
    .select("*")
    .maybeSingle()
  if (lockError) throw lockError
  if (!locking) throw new Error("Campaign was already sent or is sending")

  const createPayload: {
    name: string
    from: string
    subject: string
    html: string
    text: string
    segmentId: string
    topicId: string
    previewText?: string
    replyTo?: string[]
  } = {
    name: `Org ${organizationId} · ${campaign.name}`,
    from: formatFrom(campaign.from_name, campaign.from_email),
    subject,
    html,
    text,
    segmentId: segment.resend_segment_id,
    topicId: topic.resend_topic_id,
  }
  if (campaign.preview_text) createPayload.previewText = campaign.preview_text
  if (campaign.reply_to) createPayload.replyTo = [campaign.reply_to]

  const { data: broadcast, error: createError } =
    await resend.broadcasts.create(createPayload)

  if (createError || !broadcast) {
    await supabase
      .from("campaigns")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
    throw new Error(createError?.message ?? "Failed to create broadcast")
  }

  const scheduledAt = parsed.scheduled_at ?? null
  const sendOptions = scheduledAt ? { scheduledAt } : undefined
  const { error: sendError } = await resend.broadcasts.send(
    broadcast.id,
    sendOptions
  )

  if (sendError) {
    await supabase
      .from("campaigns")
      .update({
        status: "draft",
        resend_broadcast_id: broadcast.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
    throw new Error(sendError.message)
  }

  try {
    await materializeCampaignRecipients(
      supabase,
      organizationId,
      campaignId,
      campaign.segment_id
    )
  } catch (materializeError) {
    console.error("Failed to materialize campaign recipients:", materializeError)
  }

  const nextStatus = scheduledAt ? "scheduled" : "sent"
  const { data: updated, error: updateError } = await supabase
    .from("campaigns")
    .update({
      status: nextStatus,
      resend_broadcast_id: broadcast.id,
      scheduled_at: scheduledAt,
      sent_at: scheduledAt ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .select("*")
    .single()
  if (updateError) throw updateError
  return mapCampaign(updated)
}

export async function cancelScheduledMarketingCampaign(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<MarketingCampaign> {
  const campaign = await fetchMarketingCampaign(
    supabase,
    organizationId,
    campaignId
  )
  if (!campaign) throw new Error("Campaign not found")
  if (campaign.status !== "scheduled") {
    throw new Error("Only scheduled campaigns can be canceled")
  }

  if (campaign.resend_broadcast_id) {
    const resend = getResendClient()
    if (resend) {
      // remove() on a scheduled broadcast stops delivery and deletes it.
      const { error } = await resend.broadcasts.remove(
        campaign.resend_broadcast_id
      )
      if (error) throw new Error(error.message)
    }
  }

  await clearCampaignRecipients(supabase, organizationId, campaignId)

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "canceled",
      scheduled_at: null,
      resend_broadcast_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", campaignId)
    .select("*")
    .single()
  if (error) throw error
  return mapCampaign(data)
}
