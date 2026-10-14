import type { SupabaseClient } from "@supabase/supabase-js"
import type { WebhookEventPayload } from "resend"
import { getResendClient } from "@/lib/resend"
import {
  campaignDeliveryStatsSchema,
  campaignEmailEventSchema,
  campaignEmailEventTypeSchema,
  campaignRecipientListItemSchema,
  campaignRecipientSchema,
  campaignRecipientSentEmailSchema,
  campaignRecipientStatusSchema,
  type CampaignDeliveryStats,
  type CampaignEmailEvent,
  type CampaignEmailEventType,
  type CampaignRecipient,
  type CampaignRecipientListItem,
  type CampaignRecipientSentEmail,
  type CampaignRecipientStatus,
} from "@/schemas/campaign-delivery.schema"
import {
  fetchCampaignSegment,
  resolveCampaignSegmentContacts,
} from "@/lib/services/campaign-segments"

const RESEND_TYPE_TO_EVENT: Record<string, CampaignEmailEventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
}

function mapRecipient(row: Record<string, unknown>): CampaignRecipient {
  return campaignRecipientSchema.parse(row)
}

function mapEvent(row: Record<string, unknown>): CampaignEmailEvent {
  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? row.meta
      : {}
  return campaignEmailEventSchema.parse({ ...row, meta })
}

function timestampColumnFor(
  eventType: CampaignEmailEventType
):
  | "sent_at"
  | "delivered_at"
  | "opened_at"
  | "clicked_at"
  | "bounced_at"
  | "complained_at"
  | "unsubscribed_at"
  | null {
  switch (eventType) {
    case "sent":
      return "sent_at"
    case "delivered":
      return "delivered_at"
    case "opened":
      return "opened_at"
    case "clicked":
      return "clicked_at"
    case "bounced":
      return "bounced_at"
    case "complained":
      return "complained_at"
    case "unsubscribed":
      return "unsubscribed_at"
    default:
      return null
  }
}

function asStatus(eventType: CampaignEmailEventType): CampaignRecipientStatus {
  return campaignRecipientStatusSchema.parse(eventType)
}

/**
 * Snapshot segment contacts into campaign_recipients at send/schedule time.
 */
export async function materializeCampaignRecipients(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  segmentId: number
): Promise<number> {
  const segment = await fetchCampaignSegment(
    supabase,
    organizationId,
    segmentId
  )
  if (!segment) throw new Error("Segment not found")

  const contacts = await resolveCampaignSegmentContacts(
    supabase,
    organizationId,
    segment.filter_json
  )

  if (contacts.length === 0) return 0

  const now = new Date().toISOString()
  const rows = contacts.map((contact) => ({
    organization_id: organizationId,
    campaign_id: campaignId,
    campaign_contact_id: contact.id,
    email: contact.email,
    last_status: "queued",
    last_status_at: now,
    updated_at: now,
  }))

  const { error } = await supabase.from("campaign_recipients").upsert(rows, {
    onConflict: "campaign_id,email",
    ignoreDuplicates: true,
  })
  if (error) throw new Error(error.message)

  const emails = contacts.map((contact) => contact.email)
  const { data: recipients, error: recipientsError } = await supabase
    .from("campaign_recipients")
    .select("id, organization_id, campaign_id, created_at")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .in("email", emails)
  if (recipientsError) throw new Error(recipientsError.message)

  if (recipients && recipients.length > 0) {
    const eventRows = recipients.map((recipient) => ({
      organization_id: Number(recipient.organization_id),
      campaign_id: Number(recipient.campaign_id),
      recipient_id: Number(recipient.id),
      event_type: "queued",
      occurred_at:
        typeof recipient.created_at === "string" ? recipient.created_at : now,
      provider_event_id: `local:queued:${recipient.id}`,
      meta: {},
    }))
    const { error: eventsError } = await supabase
      .from("campaign_email_events")
      .upsert(eventRows, {
        onConflict: "provider_event_id",
        ignoreDuplicates: true,
      })
    if (eventsError) throw new Error(eventsError.message)
  }

  return rows.length
}

export async function clearCampaignRecipients(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<void> {
  const { error } = await supabase
    .from("campaign_recipients")
    .delete()
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
  if (error) throw new Error(error.message)
}

export async function fetchCampaignDeliveryStats(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId?: number | null
): Promise<CampaignDeliveryStats[]> {
  const { data, error } = await supabase.rpc("campaign_delivery_stats", {
    p_organization_id: organizationId,
    p_campaign_id: campaignId ?? null,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) =>
    campaignDeliveryStatsSchema.parse({
      campaign_id: Number(row.campaign_id),
      recipients: Number(row.recipients),
      sent: Number(row.sent),
      delivered: Number(row.delivered),
      opened: Number(row.opened),
      clicked: Number(row.clicked),
      bounced: Number(row.bounced),
      complained: Number(row.complained),
      unsubscribed: Number(row.unsubscribed),
    })
  )
}

async function enrichRecipientsWithLeadNames(
  supabase: SupabaseClient,
  organizationId: number,
  recipients: CampaignRecipient[]
): Promise<CampaignRecipientListItem[]> {
  const contactIds = [
    ...new Set(
      recipients
        .map((row) => row.campaign_contact_id)
        .filter((id): id is number => id != null)
    ),
  ]

  const leadByContactId = new Map<
    number,
    { lead_id: number | null; full_name: string | null }
  >()

  if (contactIds.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from("campaign_contacts")
      .select("id, lead_id")
      .eq("organization_id", organizationId)
      .in("id", contactIds)
    if (contactsError) throw new Error(contactsError.message)

    const leadIds = [
      ...new Set(
        (contacts ?? [])
          .map((row) => (row.lead_id == null ? null : Number(row.lead_id)))
          .filter((id): id is number => id != null && id > 0)
      ),
    ]

    const nameByLeadId = new Map<number, string>()
    if (leadIds.length > 0) {
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .in("id", leadIds)
      if (!leadsError) {
        for (const lead of leads ?? []) {
          const id = Number(lead.id)
          const fullName =
            typeof lead.full_name === "string" ? lead.full_name : null
          if (fullName) nameByLeadId.set(id, fullName)
        }
      }
    }

    for (const contact of contacts ?? []) {
      const contactId = Number(contact.id)
      const leadId = contact.lead_id == null ? null : Number(contact.lead_id)
      leadByContactId.set(contactId, {
        lead_id: leadId != null && leadId > 0 ? leadId : null,
        full_name:
          leadId != null && leadId > 0
            ? (nameByLeadId.get(leadId) ?? null)
            : null,
      })
    }
  }

  return recipients.map((recipient) => {
    const extra =
      recipient.campaign_contact_id != null
        ? leadByContactId.get(recipient.campaign_contact_id)
        : undefined
    return campaignRecipientListItemSchema.parse({
      ...recipient,
      lead_id: extra?.lead_id ?? null,
      full_name: extra?.full_name ?? null,
    })
  })
}

export type FetchCampaignRecipientsPageParams = {
  supabase: SupabaseClient
  organizationId: number
  campaignId: number
  page: number
  pageSize: number
  search?: string
  statuses?: CampaignRecipientStatus[]
}

export type CampaignRecipientsPage = {
  items: CampaignRecipientListItem[]
  total: number
}

export async function fetchCampaignRecipientsPage(
  params: FetchCampaignRecipientsPageParams
): Promise<CampaignRecipientsPage> {
  const {
    supabase,
    organizationId,
    campaignId,
    page,
    pageSize,
    search,
    statuses,
  } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("campaign_recipients")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("last_status_at", { ascending: false })
    .range(from, to)

  const term = search?.trim()
  if (term) {
    const q = term
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/'/g, "''")
    query = query.ilike("email", `%${q}%`)
  }
  if (statuses && statuses.length > 0) {
    query = query.in("last_status", statuses)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const recipients = (data ?? []).map((row) => mapRecipient(row))
  const items = await enrichRecipientsWithLeadNames(
    supabase,
    organizationId,
    recipients
  )

  return {
    items,
    total: count ?? 0,
  }
}

export async function fetchCampaignRecipients(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number
): Promise<CampaignRecipientListItem[]> {
  const page = await fetchCampaignRecipientsPage({
    supabase,
    organizationId,
    campaignId,
    page: 1,
    pageSize: 10_000,
  })
  return page.items
}

export async function fetchCampaignRecipientEvents(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  recipientId: number
): Promise<CampaignEmailEvent[]> {
  const { data, error } = await supabase
    .from("campaign_email_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .eq("recipient_id", recipientId)
    .order("occurred_at", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapEvent(row))
}

/**
 * Exact sent content from Resend. Returns null when unavailable (no provider id,
 * provider error, or empty body). No local template fallback.
 */
export async function fetchCampaignRecipientSentEmail(
  supabase: SupabaseClient,
  organizationId: number,
  campaignId: number,
  recipientId: number
): Promise<CampaignRecipientSentEmail | null> {
  const { data: row, error } = await supabase
    .from("campaign_recipients")
    .select("provider_recipient_id")
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .eq("id", recipientId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) return null

  const providerId =
    typeof row.provider_recipient_id === "string"
      ? row.provider_recipient_id.trim()
      : ""
  if (!providerId) return null

  const resend = getResendClient()
  if (!resend) return null

  const { data: email, error: resendError } =
    await resend.emails.get(providerId)
  if (resendError || !email) return null

  const subject =
    "subject" in email && typeof email.subject === "string"
      ? email.subject
      : null
  const html =
    "html" in email && typeof email.html === "string" && email.html.trim()
      ? email.html
      : null
  const text =
    "text" in email && typeof email.text === "string" && email.text.trim()
      ? email.text
      : null

  if (!html && !text) return null

  return campaignRecipientSentEmailSchema.parse({ subject, html, text })
}

/**
 * Ingest a verified Resend email.* webhook (service role).
 */
export async function ingestResendEmailWebhook(
  supabase: SupabaseClient,
  event: WebhookEventPayload,
  providerEventId: string
): Promise<{ ok: true; skipped?: string } | { ok: false; error: string }> {
  const eventType = RESEND_TYPE_TO_EVENT[event.type]
  if (!eventType) {
    return { ok: true, skipped: `ignored type ${event.type}` }
  }
  const parsedType = campaignEmailEventTypeSchema.safeParse(eventType)
  if (!parsedType.success) {
    return { ok: true, skipped: `invalid mapped type` }
  }

  if (!("data" in event) || !event.data || typeof event.data !== "object") {
    return { ok: true, skipped: "no event data" }
  }

  const data = event.data
  const broadcastId =
    "broadcast_id" in data && typeof data.broadcast_id === "string"
      ? data.broadcast_id
      : null
  if (!broadcastId) {
    return { ok: true, skipped: "no broadcast_id" }
  }

  const emailId =
    "email_id" in data && typeof data.email_id === "string"
      ? data.email_id
      : null
  const toRaw = "to" in data ? data.to : null
  const toEmail = Array.isArray(toRaw)
    ? toRaw.find((v): v is string => typeof v === "string")
    : null
  const email = toEmail ? toEmail.trim().toLowerCase() : null
  if (!emailId && !email) {
    return { ok: true, skipped: "no email identity" }
  }

  const occurredAt =
    "created_at" in data && typeof data.created_at === "string"
      ? data.created_at
      : typeof event.created_at === "string"
        ? event.created_at
        : new Date().toISOString()

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, organization_id")
    .eq("resend_broadcast_id", broadcastId)
    .maybeSingle()
  if (campaignError) return { ok: false, error: campaignError.message }
  if (!campaign) {
    return { ok: true, skipped: "campaign not found for broadcast" }
  }

  const organizationId = Number(campaign.organization_id)
  const campaignId = Number(campaign.id)

  let recipient: CampaignRecipient | null = null

  if (emailId) {
    const { data: byProvider, error } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("provider_recipient_id", emailId)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (byProvider) recipient = mapRecipient(byProvider)
  }

  if (!recipient && email) {
    const { data: byEmail, error } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("email", email)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (byEmail) recipient = mapRecipient(byEmail)
  }

  if (!recipient && email) {
    const { data: contact } = await supabase
      .from("campaign_contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle()

    const now = new Date().toISOString()
    const { data: inserted, error: insertError } = await supabase
      .from("campaign_recipients")
      .insert({
        organization_id: organizationId,
        campaign_id: campaignId,
        campaign_contact_id: contact?.id != null ? Number(contact.id) : null,
        email,
        provider_recipient_id: emailId,
        last_status: "queued",
        last_status_at: now,
        updated_at: now,
      })
      .select("*")
      .single()
    if (insertError) {
      const { data: again, error: againError } = await supabase
        .from("campaign_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("email", email)
        .maybeSingle()
      if (againError || !again) {
        return { ok: false, error: insertError.message }
      }
      recipient = mapRecipient(again)
    } else {
      recipient = mapRecipient(inserted)
    }
  }

  if (!recipient) {
    return { ok: true, skipped: "recipient unresolved" }
  }

  const meta: Record<string, unknown> = {}
  if ("click" in data && data.click && typeof data.click === "object") {
    meta.click = data.click
  }
  if ("bounce" in data && data.bounce && typeof data.bounce === "object") {
    meta.bounce = data.bounce
  }
  if ("subject" in data && typeof data.subject === "string") {
    meta.subject = data.subject
  }

  const { error: eventError } = await supabase
    .from("campaign_email_events")
    .insert({
      organization_id: organizationId,
      campaign_id: campaignId,
      recipient_id: recipient.id,
      event_type: parsedType.data,
      occurred_at: occurredAt,
      provider_event_id: providerEventId,
      meta,
    })

  if (eventError) {
    if (eventError.code === "23505") {
      return { ok: true, skipped: "duplicate event" }
    }
    return { ok: false, error: eventError.message }
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (emailId && !recipient.provider_recipient_id) {
    patch.provider_recipient_id = emailId
  }

  const tsCol = timestampColumnFor(parsedType.data)
  if (tsCol && recipient[tsCol] == null) {
    patch[tsCol] = occurredAt
  }

  const previousAt = recipient.last_status_at
    ? Date.parse(recipient.last_status_at)
    : 0
  const nextAt = Date.parse(occurredAt)
  if (!Number.isFinite(previousAt) || nextAt >= previousAt) {
    patch.last_status = asStatus(parsedType.data)
    patch.last_status_at = occurredAt
  }

  const { error: updateError } = await supabase
    .from("campaign_recipients")
    .update(patch)
    .eq("id", recipient.id)
  if (updateError) return { ok: false, error: updateError.message }

  return { ok: true }
}
