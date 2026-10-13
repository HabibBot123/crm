import type { SupabaseClient } from "@supabase/supabase-js"
import { getResendClient } from "@/lib/resend"
import { reconcileAllCampaignSegments } from "@/lib/services/campaign-segments"
import {
  campaignContactSchema,
  campaignTopicSchema,
  type CampaignContact,
  type CampaignTopic,
} from "@/schemas/campaign.schema"

const DEFAULT_TOPIC_NAME = "Marketing"

function mapTopic(row: Record<string, unknown>): CampaignTopic {
  return campaignTopicSchema.parse(row)
}

function mapContact(row: Record<string, unknown>): CampaignContact {
  return campaignContactSchema.parse(row)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Attach a Resend topic id to the org Marketing row (seeded at org create).
 * Call when registering a sending domain. Soft-fails if Resend key missing.
 */
export async function attachResendCampaignTopic(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CampaignTopic | null> {
  const { data: existing, error: existingError } = await supabase
    .from("campaign_topics")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("name", DEFAULT_TOPIC_NAME)
    .maybeSingle()
  if (existingError) throw existingError

  if (!existing) {
    const { data: inserted, error: insertError } = await supabase
      .from("campaign_topics")
      .insert({
        organization_id: organizationId,
        name: DEFAULT_TOPIC_NAME,
        resend_topic_id: null,
      })
      .select("*")
      .single()
    if (insertError) throw insertError
    return await ensureResendTopicId(supabase, mapTopic(inserted))
  }

  const topic = mapTopic(existing)
  if (topic.resend_topic_id) return topic
  return ensureResendTopicId(supabase, topic)
}

async function ensureResendTopicId(
  supabase: SupabaseClient,
  topic: CampaignTopic
): Promise<CampaignTopic> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("attachResendCampaignTopic: Resend client not configured")
    return topic
  }

  const { data: created, error: resendError } = await resend.topics.create({
    name: `Org ${topic.organization_id} ${DEFAULT_TOPIC_NAME}`,
    defaultSubscription: "opt_out",
    description: "Marketing campaigns",
    visibility: "private",
  })
  if (resendError || !created) {
    console.warn(
      "Resend topic create failed:",
      resendError?.message ?? "unknown error"
    )
    return topic
  }

  const { data, error } = await supabase
    .from("campaign_topics")
    .update({
      resend_topic_id: created.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", topic.id)
    .select("*")
    .single()
  if (error) throw error
  return mapTopic(data)
}

/**
 * Upsert Resend contact + org Marketing topic subscription.
 * Prefer service-role / admin supabase (writes `resend_contact_id`, may attach topic).
 * Server-only: uses RESEND_API_KEY.
 */
export async function syncCampaignContactToResend(
  supabase: SupabaseClient,
  input: { organizationId: number; email: string }
): Promise<{ resendContactId: string | null }> {
  const email = normalizeEmail(input.email)
  if (!email) return { resendContactId: null }

  const resend = getResendClient()
  if (!resend) return { resendContactId: null }

  const { data: contactRow, error: contactError } = await supabase
    .from("campaign_contacts")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("email", email)
    .maybeSingle()
  if (contactError) throw contactError
  if (!contactRow) return { resendContactId: null }

  const contact = mapContact(contactRow)

  const topic = await attachResendCampaignTopic(supabase, input.organizationId)
  if (!topic?.resend_topic_id) {
    console.warn(
      `syncCampaignContactToResend: no Resend topic for org ${input.organizationId}`
    )
    return { resendContactId: contact.resend_contact_id }
  }

  const subscription = contact.marketing_opt_in ? "opt_in" : "opt_out"
  let resendContactId = contact.resend_contact_id

  if (!resendContactId) {
    const { data: created, error: createError } = await resend.contacts.create({
      email,
      unsubscribed: false,
      topics: [{ id: topic.resend_topic_id, subscription }],
    })

    if (createError || !created) {
      const { data: existing, error: getError } = await resend.contacts.get({
        email,
      })
      if (getError || !existing) {
        console.warn(
          "syncCampaignContactToResend create failed:",
          createError?.message ?? getError?.message ?? "unknown"
        )
        return { resendContactId: null }
      }
      resendContactId = existing.id
      const { error: topicError } = await resend.contacts.topics.update({
        id: resendContactId,
        topics: [{ id: topic.resend_topic_id, subscription }],
      })
      if (topicError) {
        console.warn(
          "syncCampaignContactToResend topic update failed:",
          topicError.message
        )
      }
    } else {
      resendContactId = created.id
    }
  } else {
    const { error: topicError } = await resend.contacts.topics.update({
      id: resendContactId,
      topics: [{ id: topic.resend_topic_id, subscription }],
    })
    if (topicError) {
      console.warn(
        "syncCampaignContactToResend topic update failed:",
        topicError.message
      )
    }
  }

  if (resendContactId && resendContactId !== contact.resend_contact_id) {
    const { error: updateError } = await supabase
      .from("campaign_contacts")
      .update({
        resend_contact_id: resendContactId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id)
    if (updateError) throw updateError
  }

  return { resendContactId }
}

export type CampaignAudienceStats = {
  opted_in: number
  synced: number
  pending: number
}

export async function fetchCampaignAudienceStats(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CampaignAudienceStats> {
  const { count: optedIn, error: optedInError } = await supabase
    .from("campaign_contacts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("marketing_opt_in", true)
  if (optedInError) throw optedInError

  const { count: synced, error: syncedError } = await supabase
    .from("campaign_contacts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("marketing_opt_in", true)
    .not("resend_contact_id", "is", null)
  if (syncedError) throw syncedError

  const optedInCount = optedIn ?? 0
  const syncedCount = synced ?? 0
  return {
    opted_in: optedInCount,
    synced: syncedCount,
    pending: Math.max(0, optedInCount - syncedCount),
  }
}

/**
 * Sync opted-in org contacts missing a Resend id.
 * Loops in batches until drained or maxBatches reached.
 */
export async function syncOrgCampaignContactsToResend(
  supabase: SupabaseClient,
  organizationId: number,
  options?: { batchSize?: number; maxBatches?: number }
): Promise<{
  attempted: number
  synced: number
  segments: number
  segment_added: number
  segment_removed: number
}> {
  await attachResendCampaignTopic(supabase, organizationId)

  const batchSize = options?.batchSize ?? 50
  const maxBatches = options?.maxBatches ?? 20
  let attempted = 0
  let synced = 0

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data: rows, error } = await supabase
      .from("campaign_contacts")
      .select("email")
      .eq("organization_id", organizationId)
      .eq("marketing_opt_in", true)
      .is("resend_contact_id", null)
      .order("id", { ascending: true })
      .limit(batchSize)
    if (error) throw error

    const emails = (rows ?? [])
      .map((row) => (typeof row.email === "string" ? row.email : null))
      .filter((email): email is string => email != null && email.length > 0)

    if (emails.length === 0) break

    for (const email of emails) {
      attempted += 1
      try {
        const result = await syncCampaignContactToResend(supabase, {
          organizationId,
          email,
        })
        if (result.resendContactId) synced += 1
      } catch (error) {
        console.warn("syncOrgCampaignContactsToResend item failed:", error)
      }
    }

    if (emails.length < batchSize) break
  }

  const segmentResult = await reconcileAllCampaignSegments(supabase, organizationId)

  return {
    attempted,
    synced,
    segments: segmentResult.segments,
    segment_added: segmentResult.added,
    segment_removed: segmentResult.removed,
  }
}
