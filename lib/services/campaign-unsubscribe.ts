import type { SupabaseClient } from "@supabase/supabase-js"
import { getResendClient } from "@/lib/resend"
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/campaigns/unsubscribe"
import { attachResendCampaignTopic } from "@/lib/services/campaign-contacts"

export type UnsubscribePreview = {
  organizationName: string
  email: string
  alreadyOptedOut: boolean
}

function parseCampaignId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed)
  }
  return null
}

/**
 * Attribute unsubscribe to the campaign from query `c` (no last-campaign fallback).
 * Idempotent via provider_event_id.
 */
async function recordCampaignUnsubscribeEvent(
  supabase: SupabaseClient,
  input: {
    organizationId: number
    email: string
    campaignId: number
  }
): Promise<void> {
  const { data: recipient, error: recipientError } = await supabase
    .from("campaign_recipients")
    .select("id, unsubscribed_at, last_status_at")
    .eq("organization_id", input.organizationId)
    .eq("campaign_id", input.campaignId)
    .eq("email", input.email)
    .maybeSingle()
  if (recipientError) {
    console.warn(
      "recordCampaignUnsubscribeEvent recipient lookup failed:",
      recipientError.message
    )
    return
  }
  if (!recipient) return

  const occurredAt = new Date().toISOString()
  const providerEventId = `cs_unsub:${input.campaignId}:${recipient.id}`

  const { error: eventError } = await supabase.from("campaign_email_events").insert({
    organization_id: input.organizationId,
    campaign_id: input.campaignId,
    recipient_id: recipient.id,
    event_type: "unsubscribed",
    occurred_at: occurredAt,
    provider_event_id: providerEventId,
    meta: { source: "coachstack_unsubscribe" },
  })
  if (eventError) {
    if (eventError.code !== "23505") {
      console.warn(
        "recordCampaignUnsubscribeEvent insert failed:",
        eventError.message
      )
    }
    return
  }

  const patch: Record<string, unknown> = {
    updated_at: occurredAt,
  }
  if (recipient.unsubscribed_at == null) {
    patch.unsubscribed_at = occurredAt
  }

  const previousAt = recipient.last_status_at
    ? Date.parse(recipient.last_status_at)
    : 0
  const nextAt = Date.parse(occurredAt)
  if (!Number.isFinite(previousAt) || nextAt >= previousAt) {
    patch.last_status = "unsubscribed"
    patch.last_status_at = occurredAt
  }

  const { error: updateError } = await supabase
    .from("campaign_recipients")
    .update(patch)
    .eq("id", recipient.id)
  if (updateError) {
    console.warn(
      "recordCampaignUnsubscribeEvent recipient update failed:",
      updateError.message
    )
  }
}

export function previewUnsubscribeToken(
  token: string
): { organizationId: number; email: string } | null {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return null
  return { organizationId: payload.o, email: payload.e }
}

export async function fetchUnsubscribePreview(
  supabase: SupabaseClient,
  token: string
): Promise<UnsubscribePreview | null> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return null

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", payload.o)
    .maybeSingle()
  if (orgError) throw orgError
  if (!org) return null

  const { data: contact, error: contactError } = await supabase
    .from("campaign_contacts")
    .select("marketing_opt_in")
    .eq("organization_id", payload.o)
    .eq("email", payload.e)
    .maybeSingle()
  if (contactError) throw contactError

  return {
    organizationName: typeof org.name === "string" ? org.name : "this organization",
    email: payload.e,
    alreadyOptedOut: contact?.marketing_opt_in === false,
  }
}

/**
 * Opt out of marketing for one org+email. Never sets Resend global unsubscribed.
 * When `campaignId` is present and matches a recipient row, records funnel unsub event.
 */
export async function confirmCampaignUnsubscribe(
  supabase: SupabaseClient,
  token: string,
  campaignIdRaw?: unknown
): Promise<{ ok: true; alreadyOptedOut: boolean } | { ok: false; error: string }> {
  const payload = verifyUnsubscribeToken(token)
  if (!payload) return { ok: false, error: "Invalid or expired unsubscribe link" }

  const organizationId = payload.o
  const email = payload.e
  const campaignId = parseCampaignId(campaignIdRaw)
  const now = new Date().toISOString()

  const { data: contact, error: contactError } = await supabase
    .from("campaign_contacts")
    .select("id, marketing_opt_in, resend_contact_id, lead_id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .maybeSingle()
  if (contactError) return { ok: false, error: contactError.message }

  if (!contact) {
    return { ok: false, error: "Contact not found" }
  }

  const alreadyOptedOut = contact.marketing_opt_in === false

  if (!alreadyOptedOut) {
    const { error: updateError } = await supabase
      .from("campaign_contacts")
      .update({
        marketing_opt_in: false,
        opted_out_at: now,
        updated_at: now,
      })
      .eq("id", contact.id)
    if (updateError) return { ok: false, error: updateError.message }

    if (contact.lead_id != null) {
      const { error: leadError } = await supabase
        .from("leads")
        .update({ marketing_opt_in: false })
        .eq("id", contact.lead_id)
        .eq("organization_id", organizationId)
      if (leadError) {
        console.warn(
          "confirmCampaignUnsubscribe lead update failed:",
          leadError.message
        )
      }
    }

    const resend = getResendClient()
    const resendContactId =
      typeof contact.resend_contact_id === "string"
        ? contact.resend_contact_id
        : null
    if (resend && resendContactId) {
      const topic = await attachResendCampaignTopic(supabase, organizationId)
      if (topic?.resend_topic_id) {
        const { error: topicError } = await resend.contacts.topics.update({
          id: resendContactId,
          topics: [{ id: topic.resend_topic_id, subscription: "opt_out" }],
        })
        if (topicError) {
          console.warn(
            "confirmCampaignUnsubscribe Resend topic opt_out failed:",
            topicError.message
          )
        }
      }
    }
  }

  if (campaignId != null) {
    await recordCampaignUnsubscribeEvent(supabase, {
      organizationId,
      email,
      campaignId,
    })
  }

  return { ok: true, alreadyOptedOut }
}

export function buildTokenForContact(organizationId: number, email: string): string {
  return createUnsubscribeToken({ organizationId, email })
}
