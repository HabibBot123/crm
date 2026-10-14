import type { SupabaseClient } from "@supabase/supabase-js"
import type { Resend } from "resend"
import { getResendClient } from "@/lib/resend"
import { reconcileAllCampaignSegments } from "@/lib/services/campaign-segments"
import { ensureOrgContactProperties } from "@/lib/campaigns/contact-properties"
import { createUnsubscribeToken } from "@/lib/campaigns/unsubscribe"
import {
  campaignAudienceContactSchema,
  campaignContactSchema,
  campaignTopicSchema,
  type CampaignAudienceContact,
  type CampaignAudienceOrigin,
  type CampaignContact,
  type CampaignTopic,
} from "@/schemas/campaign.schema"
import type { CampaignSegmentFilterGroup } from "@/schemas/campaign-segment.schema"
import { escapeIlikeTerm } from "@/lib/campaigns/delivery-labels"

const DEFAULT_TOPIC_NAME = "Marketing"

/** Ensure Resend contact property `cs_unsub_{orgId}` exists (idempotent). */
export async function ensureUnsubscribeContactProperty(
  resend: Resend,
  organizationId: number
): Promise<string> {
  const keys = await ensureOrgContactProperties(resend, organizationId)
  return keys.unsubscribeKey
}

function classifyProviderSyncError(message: string): string {
  const lower = message.toLowerCase()
  if (
    lower.includes("quota") ||
    lower.includes("contact limit") ||
    lower.includes("contacts limit")
  ) {
    return "contacts_quota_exceeded"
  }
  return message.slice(0, 240)
}

async function markProviderSyncError(
  supabase: SupabaseClient,
  contactId: number,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from("campaign_contacts")
    .update({
      provider_sync_error: classifyProviderSyncError(errorMessage),
    })
    .eq("id", contactId)
  if (error) {
    console.warn("markProviderSyncError failed:", error.message)
  }
}

async function markProviderSyncSuccess(
  supabase: SupabaseClient,
  contactId: number,
  resendContactId: string
): Promise<void> {
  const { error } = await supabase
    .from("campaign_contacts")
    .update({
      resend_contact_id: resendContactId,
      provider_properties_synced_at: new Date().toISOString(),
      provider_sync_error: null,
    })
    .eq("id", contactId)
  if (error) throw error
}

function mapTopic(row: Record<string, unknown>): CampaignTopic {
  return campaignTopicSchema.parse(row)
}

function mapContact(row: Record<string, unknown>): CampaignContact {
  return campaignContactSchema.parse(row)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function splitDisplayName(fullName: string | null | undefined): {
  firstName: string | undefined
  lastName: string | undefined
} {
  if (fullName == null) return { firstName: undefined, lastName: undefined }
  const trimmed = fullName.trim()
  if (!trimmed) return { firstName: undefined, lastName: undefined }
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

async function resolveContactDisplayName(
  supabase: SupabaseClient,
  contact: CampaignContact
): Promise<{ firstName: string | undefined; lastName: string | undefined }> {
  if (contact.lead_id != null) {
    const { data } = await supabase
      .from("leads")
      .select("first_name, last_name")
      .eq("id", contact.lead_id)
      .maybeSingle()
    if (data) {
      const firstName =
        typeof data.first_name === "string" && data.first_name.trim()
          ? data.first_name.trim()
          : undefined
      const lastName =
        typeof data.last_name === "string" && data.last_name.trim()
          ? data.last_name.trim()
          : undefined
      if (firstName || lastName) {
        return { firstName, lastName }
      }
    }
  }
  if (contact.enrollment_id != null) {
    const { data } = await supabase
      .from("enrollments")
      .select("buyer_name")
      .eq("id", contact.enrollment_id)
      .maybeSingle()
    if (data && typeof data.buyer_name === "string") {
      return splitDisplayName(data.buyer_name)
    }
  }
  return { firstName: undefined, lastName: undefined }
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
 * Upsert Resend contact + org-scoped properties + Marketing topic.
 * Prefer service-role / admin supabase. Server-only: uses RESEND_API_KEY.
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
  const { firstName, lastName } = await resolveContactDisplayName(
    supabase,
    contact
  )

  const topic = await attachResendCampaignTopic(supabase, input.organizationId)
  if (!topic?.resend_topic_id) {
    console.warn(
      `syncCampaignContactToResend: no Resend topic for org ${input.organizationId}`
    )
    return { resendContactId: contact.resend_contact_id }
  }

  const propertyKeys = await ensureOrgContactProperties(
    resend,
    input.organizationId
  )
  const unsubscribeToken = createUnsubscribeToken({
    organizationId: input.organizationId,
    email,
  })
  const orgProperties: Record<string, string> = {
    [propertyKeys.unsubscribeKey]: unsubscribeToken,
    [propertyKeys.firstNameKey]: firstName ?? "",
    [propertyKeys.lastNameKey]: lastName ?? "",
  }

  const subscription = contact.marketing_opt_in ? "opt_in" : "opt_out"
  let resendContactId = contact.resend_contact_id

  if (!resendContactId) {
    const { data: created, error: createError } = await resend.contacts.create({
      email,
      unsubscribed: false,
      properties: orgProperties,
      topics: [{ id: topic.resend_topic_id, subscription }],
    })

    if (createError || !created) {
      const { data: existing, error: getError } = await resend.contacts.get({
        email,
      })
      if (getError || !existing) {
        const message =
          createError?.message ?? getError?.message ?? "unknown create error"
        console.warn("syncCampaignContactToResend create failed:", message)
        await markProviderSyncError(supabase, contact.id, message)
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
      const { error: propsError } = await resend.contacts.update({
        id: resendContactId,
        properties: orgProperties,
      })
      if (propsError) {
        console.warn(
          "syncCampaignContactToResend properties update failed:",
          propsError.message
        )
        await markProviderSyncError(supabase, contact.id, propsError.message)
        return { resendContactId }
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
    const { error: propsError } = await resend.contacts.update({
      id: resendContactId,
      properties: orgProperties,
    })
    if (propsError) {
      console.warn(
        "syncCampaignContactToResend properties update failed:",
        propsError.message
      )
      await markProviderSyncError(supabase, contact.id, propsError.message)
      return { resendContactId }
    }
  }

  if (resendContactId) {
    await markProviderSyncSuccess(supabase, contact.id, resendContactId)
  }

  return { resendContactId }
}

/**
 * Sync segment contacts that are missing provider id or have invalidated properties.
 */
export async function syncDirtySegmentContactsToResend(
  supabase: SupabaseClient,
  organizationId: number,
  segmentFilterJson: CampaignSegmentFilterGroup,
  options?: { limit?: number }
): Promise<{ attempted: number; synced: number }> {
  const contacts = await resolveCampaignSegmentContactsForSync(
    supabase,
    organizationId,
    segmentFilterJson
  )
  const dirty = contacts.filter(
    (contact) =>
      contact.resend_contact_id == null ||
      contact.provider_properties_synced_at == null
  )
  const limit = options?.limit ?? 200
  const batch = dirty.slice(0, limit)
  let synced = 0
  for (const contact of batch) {
    try {
      const result = await syncCampaignContactToResend(supabase, {
        organizationId,
        email: contact.email,
      })
      if (result.resendContactId) synced += 1
    } catch (error) {
      console.warn("syncDirtySegmentContactsToResend item failed:", error)
    }
  }
  return { attempted: batch.length, synced }
}

async function resolveCampaignSegmentContactsForSync(
  supabase: SupabaseClient,
  organizationId: number,
  filterJson: CampaignSegmentFilterGroup
): Promise<
  Array<{
    email: string
    resend_contact_id: string | null
    provider_properties_synced_at: string | null
  }>
> {
  const { resolveCampaignSegmentContacts } = await import(
    "@/lib/services/campaign-segments"
  )
  const contacts = await resolveCampaignSegmentContacts(
    supabase,
    organizationId,
    filterJson
  )
  if (contacts.length === 0) return []

  const ids = contacts.map((contact) => contact.id)
  const { data, error } = await supabase
    .from("campaign_contacts")
    .select("id, email, resend_contact_id, provider_properties_synced_at")
    .eq("organization_id", organizationId)
    .in("id", ids)
  if (error) throw error

  return (data ?? []).map((row) => ({
    email: typeof row.email === "string" ? row.email : "",
    resend_contact_id:
      typeof row.resend_contact_id === "string" ? row.resend_contact_id : null,
    provider_properties_synced_at:
      typeof row.provider_properties_synced_at === "string"
        ? row.provider_properties_synced_at
        : null,
  }))
}

export type CampaignAudienceStats = {
  opted_in: number
  synced: number
  pending: number
}

export type FetchCampaignAudienceContactsPageParams = {
  supabase: SupabaseClient
  organizationId: number
  page: number
  pageSize: number
  search?: string
  origins?: CampaignAudienceOrigin[]
  optIn?: boolean | null
  synced?: boolean | null
}

export type CampaignAudienceContactsPage = {
  items: CampaignAudienceContact[]
  total: number
}

function mapAudienceContact(row: unknown): CampaignAudienceContact {
  return campaignAudienceContactSchema.parse(row)
}

export async function fetchCampaignAudienceContactsPage(
  params: FetchCampaignAudienceContactsPageParams
): Promise<CampaignAudienceContactsPage> {
  const {
    supabase,
    organizationId,
    page,
    pageSize,
    search,
    origins,
    optIn,
    synced,
  } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("v_campaign_audience_contacts")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .range(from, to)

  const term = search?.trim()
  if (term) {
    const q = escapeIlikeTerm(term)
    query = query.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,full_name.ilike.%${q}%`
    )
  }
  if (origins && origins.length > 0) {
    query = query.in("origin", origins)
  }
  if (optIn === true || optIn === false) {
    query = query.eq("marketing_opt_in", optIn)
  }
  if (synced === true) {
    query = query.eq("synced", true)
  } else if (synced === false) {
    query = query.eq("synced", false)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    items: (data ?? []).map(mapAudienceContact),
    total: count ?? 0,
  }
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
      .or("resend_contact_id.is.null,provider_properties_synced_at.is.null")
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
