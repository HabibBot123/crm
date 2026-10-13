import type { SupabaseClient } from "@supabase/supabase-js"
import { getResendClient } from "@/lib/resend"
import {
  campaignSegmentFilterGroupSchema,
  campaignSegmentSchema,
  createCampaignSegmentSchema,
  emptyCampaignSegmentFilter,
  isEmptySegmentFilter,
  updateCampaignSegmentSchema,
  type CampaignSegment,
  type CampaignSegmentCondition,
  type CampaignSegmentFilterGroup,
  type CreateCampaignSegmentInput,
  type UpdateCampaignSegmentInput,
} from "@/schemas/campaign-segment.schema"

type ContactRow = {
  id: number
  email: string
  lead_id: number | null
  enrollment_id: number | null
  resend_contact_id: string | null
}

type LeadRow = {
  id: number
  status: string
  origin: string
  business_unit_id: number | null
  created_at: string
}

type FieldValueRow = {
  lead_id: number
  field_def_id: number
  value: string
}

type EnrollmentRow = {
  id: number
  buyer_email: string
  offer_id: number
  created_at: string
  status: string
}

type EnrollmentProductRow = {
  enrollment_id: number
  product_id: number
}

function mapSegment(row: Record<string, unknown>): CampaignSegment {
  return campaignSegmentSchema.parse({
    ...row,
    filter_json: campaignSegmentFilterGroupSchema.parse(row.filter_json),
  })
}

function dayStartIso(ymd: string): string {
  return `${ymd}T00:00:00.000Z`
}

function dayEndIso(ymd: string): string {
  return `${ymd}T23:59:59.999Z`
}

function matchesDate(
  iso: string | null | undefined,
  condition: Extract<
    CampaignSegmentCondition,
    { type: "lead_created_at" | "enrollment_created_at" }
  >
): boolean {
  if (!iso) return false
  const ts = Date.parse(iso)
  if (!Number.isFinite(ts)) return false

  switch (condition.op) {
    case "before":
      return condition.to != null ? ts < Date.parse(dayStartIso(condition.to)) : false
    case "after":
      return condition.from != null ? ts > Date.parse(dayEndIso(condition.from)) : false
    case "on_or_after":
      return condition.from != null ? ts >= Date.parse(dayStartIso(condition.from)) : false
    case "on_or_before":
      return condition.to != null ? ts <= Date.parse(dayEndIso(condition.to)) : false
    case "between":
      if (condition.from == null || condition.to == null) return false
      return (
        ts >= Date.parse(dayStartIso(condition.from)) &&
        ts <= Date.parse(dayEndIso(condition.to))
      )
    default:
      return false
  }
}

function listMatch(haystack: string | number | null | undefined, op: "in" | "not_in", values: Array<string | number>): boolean {
  if (haystack == null) return op === "not_in"
  const hit = values.some((value) => String(value) === String(haystack))
  return op === "in" ? hit : !hit
}

function fieldValuesMatch(
  raw: string | undefined,
  op: "in" | "not_in" | "exists" | "not_exists",
  values: string[] | undefined
): boolean {
  if (op === "exists") return raw != null && raw.trim().length > 0
  if (op === "not_exists") return raw == null || raw.trim().length === 0
  if (raw == null) return op === "not_in"
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean)
  const wanted = values ?? []
  const hit = wanted.some((value) => parts.includes(value))
  return op === "in" ? hit : !hit
}

type ResolveContext = {
  contacts: ContactRow[]
  leadsById: Map<number, LeadRow>
  fieldValuesByLead: Map<number, FieldValueRow[]>
  enrollmentsByEmail: Map<string, EnrollmentRow[]>
  productsByEnrollment: Map<number, number[]>
}

function evaluateCondition(
  contact: ContactRow,
  condition: CampaignSegmentCondition,
  ctx: ResolveContext
): boolean {
  const lead = contact.lead_id != null ? ctx.leadsById.get(contact.lead_id) : undefined
  const enrollments = ctx.enrollmentsByEmail.get(contact.email) ?? []
  const activeEnrollments = enrollments.filter(
    (row) => row.status === "active" || row.status === "paused"
  )

  switch (condition.type) {
    case "lead_status":
      return listMatch(lead?.status, condition.op, condition.values)
    case "lead_origin":
      return listMatch(lead?.origin, condition.op, condition.values)
    case "business_unit":
      return listMatch(lead?.business_unit_id, condition.op, condition.values)
    case "lead_created_at":
      return matchesDate(lead?.created_at, condition)
    case "is_client": {
      const isClient = activeEnrollments.length > 0 || contact.enrollment_id != null
      return condition.value ? isClient : !isClient
    }
    case "offer": {
      const offerIds = enrollments.map((row) => row.offer_id)
      const hit = condition.values.some((id) => offerIds.includes(id))
      return condition.op === "in" ? hit : !hit
    }
    case "product": {
      const productIds = enrollments.flatMap(
        (row) => ctx.productsByEnrollment.get(row.id) ?? []
      )
      const hit = condition.values.some((id) => productIds.includes(id))
      return condition.op === "in" ? hit : !hit
    }
    case "enrollment_created_at": {
      if (enrollments.length === 0) return false
      return enrollments.some((row) => matchesDate(row.created_at, condition))
    }
    case "form_field": {
      const values =
        contact.lead_id != null
          ? ctx.fieldValuesByLead.get(contact.lead_id) ?? []
          : []
      const raw = values.find((row) => row.field_def_id === condition.field_def_id)?.value
      return fieldValuesMatch(raw, condition.op, condition.values)
    }
    default:
      return false
  }
}

function evaluateNode(
  contact: ContactRow,
  node: CampaignSegmentFilterGroup | CampaignSegmentCondition,
  ctx: ResolveContext
): boolean {
  if ("type" in node) {
    return evaluateCondition(contact, node, ctx)
  }

  const results = node.conditions.map((child) => evaluateNode(contact, child, ctx))
  const combined =
    node.conditions.length === 0
      ? true
      : node.op === "and"
        ? results.every(Boolean)
        : results.some(Boolean)
  return node.not ? !combined : combined
}

async function loadResolveContext(
  supabase: SupabaseClient,
  organizationId: number,
  contacts: ContactRow[]
): Promise<ResolveContext> {
  const leadIds = [
    ...new Set(
      contacts
        .map((contact) => contact.lead_id)
        .filter((id): id is number => typeof id === "number")
    ),
  ]
  const emails = [...new Set(contacts.map((contact) => contact.email))]

  const leadsById = new Map<number, LeadRow>()
  if (leadIds.length > 0) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, status, origin, business_unit_id, created_at")
      .eq("organization_id", organizationId)
      .in("id", leadIds)
    if (error) throw error
    for (const row of data ?? []) {
      leadsById.set(Number(row.id), {
        id: Number(row.id),
        status: String(row.status),
        origin: String(row.origin),
        business_unit_id:
          row.business_unit_id == null ? null : Number(row.business_unit_id),
        created_at: String(row.created_at),
      })
    }
  }

  const fieldValuesByLead = new Map<number, FieldValueRow[]>()
  if (leadIds.length > 0) {
    const { data, error } = await supabase
      .from("lead_field_values")
      .select("lead_id, field_def_id, value")
      .in("lead_id", leadIds)
    if (error) throw error
    for (const row of data ?? []) {
      const leadId = Number(row.lead_id)
      const list = fieldValuesByLead.get(leadId) ?? []
      list.push({
        lead_id: leadId,
        field_def_id: Number(row.field_def_id),
        value: String(row.value ?? ""),
      })
      fieldValuesByLead.set(leadId, list)
    }
  }

  const enrollmentsByEmail = new Map<string, EnrollmentRow[]>()
  const enrollmentIds: number[] = []
  if (emails.length > 0) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id, buyer_email, offer_id, created_at, status")
      .eq("organization_id", organizationId)
      .in("buyer_email", emails)
    if (error) throw error
    for (const row of data ?? []) {
      const email = String(row.buyer_email).toLowerCase()
      const enrollment: EnrollmentRow = {
        id: Number(row.id),
        buyer_email: email,
        offer_id: Number(row.offer_id),
        created_at: String(row.created_at),
        status: String(row.status),
      }
      enrollmentIds.push(enrollment.id)
      const list = enrollmentsByEmail.get(email) ?? []
      list.push(enrollment)
      enrollmentsByEmail.set(email, list)
    }
  }

  const productsByEnrollment = new Map<number, number[]>()
  if (enrollmentIds.length > 0) {
    const { data, error } = await supabase
      .from("enrollment_products")
      .select("enrollment_id, product_id")
      .in("enrollment_id", enrollmentIds)
    if (error) throw error
    for (const row of data ?? []) {
      const enrollmentId = Number(row.enrollment_id)
      const list = productsByEnrollment.get(enrollmentId) ?? []
      list.push(Number(row.product_id))
      productsByEnrollment.set(enrollmentId, list)
    }
  }

  return {
    contacts,
    leadsById,
    fieldValuesByLead,
    enrollmentsByEmail,
    productsByEnrollment,
  }
}

export async function fetchCampaignSegments(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CampaignSegment[]> {
  const { data, error } = await supabase
    .from("campaign_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => mapSegment(row))
}

export async function fetchCampaignSegment(
  supabase: SupabaseClient,
  organizationId: number,
  segmentId: number
): Promise<CampaignSegment | null> {
  const { data, error } = await supabase
    .from("campaign_segments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapSegment(data)
}

export async function createCampaignSegment(
  supabase: SupabaseClient,
  organizationId: number,
  input: CreateCampaignSegmentInput
): Promise<CampaignSegment> {
  const parsed = createCampaignSegmentSchema.parse(input)
  const { data, error } = await supabase
    .from("campaign_segments")
    .insert({
      organization_id: organizationId,
      name: parsed.name,
      filter_json: parsed.filter_json,
    })
    .select("*")
    .single()
  if (error) throw error
  return mapSegment(data)
}

export async function updateCampaignSegment(
  supabase: SupabaseClient,
  organizationId: number,
  segmentId: number,
  input: UpdateCampaignSegmentInput
): Promise<CampaignSegment> {
  const parsed = updateCampaignSegmentSchema.parse(input)
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.name != null) patch.name = parsed.name
  if (parsed.filter_json != null) patch.filter_json = parsed.filter_json

  const { data, error } = await supabase
    .from("campaign_segments")
    .update(patch)
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
    .select("*")
    .single()
  if (error) throw error
  return mapSegment(data)
}

export async function deleteCampaignSegment(
  supabase: SupabaseClient,
  organizationId: number,
  segmentId: number
): Promise<void> {
  const existing = await fetchCampaignSegment(supabase, organizationId, segmentId)
  if (!existing) return

  if (existing.resend_segment_id) {
    const resend = getResendClient()
    if (resend) {
      const { error } = await resend.segments.remove(existing.resend_segment_id)
      if (error) {
        console.warn("Resend segment remove failed:", error.message)
      }
    }
  }

  const { error } = await supabase
    .from("campaign_segments")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", segmentId)
  if (error) throw error
}

export async function resolveCampaignSegmentContacts(
  supabase: SupabaseClient,
  organizationId: number,
  filter: CampaignSegmentFilterGroup
): Promise<ContactRow[]> {
  const parsedFilter = campaignSegmentFilterGroupSchema.parse(filter)

  const { data, error } = await supabase
    .from("campaign_contacts")
    .select("id, email, lead_id, enrollment_id, resend_contact_id")
    .eq("organization_id", organizationId)
    .eq("marketing_opt_in", true)
  if (error) throw error

  const contacts: ContactRow[] = (data ?? []).map((row) => ({
    id: Number(row.id),
    email: String(row.email).toLowerCase(),
    lead_id: row.lead_id == null ? null : Number(row.lead_id),
    enrollment_id: row.enrollment_id == null ? null : Number(row.enrollment_id),
    resend_contact_id:
      typeof row.resend_contact_id === "string" ? row.resend_contact_id : null,
  }))

  if (isEmptySegmentFilter(parsedFilter)) return contacts

  const ctx = await loadResolveContext(supabase, organizationId, contacts)
  return contacts.filter((contact) => evaluateNode(contact, parsedFilter, ctx))
}

export async function previewCampaignSegment(
  supabase: SupabaseClient,
  organizationId: number,
  filter: CampaignSegmentFilterGroup
): Promise<{ total: number; synced: number; pending: number }> {
  const matched = await resolveCampaignSegmentContacts(
    supabase,
    organizationId,
    filter
  )
  const synced = matched.filter((contact) => contact.resend_contact_id != null).length
  return {
    total: matched.length,
    synced,
    pending: matched.length - synced,
  }
}

async function listResendSegmentContactIds(segmentId: string): Promise<Set<string>> {
  const resend = getResendClient()
  if (!resend) return new Set()

  const ids = new Set<string>()
  let after: string | undefined

  for (let page = 0; page < 50; page += 1) {
    const { data, error } = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    })
    if (error || !data) {
      if (error) console.warn("listResendSegmentContactIds failed:", error.message)
      break
    }

    const rows = Array.isArray(data) ? data : data.data
    if (!Array.isArray(rows) || rows.length === 0) break

    for (const row of rows) {
      if (row && typeof row === "object" && "id" in row && typeof row.id === "string") {
        ids.add(row.id)
      }
    }

    const last = rows[rows.length - 1]
    if (
      !last ||
      typeof last !== "object" ||
      !("id" in last) ||
      typeof last.id !== "string"
    ) {
      break
    }
    after = last.id
    if (rows.length < 100) break
  }

  return ids
}

async function ensureResendSegmentId(
  supabase: SupabaseClient,
  segment: CampaignSegment
): Promise<string | null> {
  if (segment.resend_segment_id) return segment.resend_segment_id

  const resend = getResendClient()
  if (!resend) return null

  const { data, error } = await resend.segments.create({
    name: `Org ${segment.organization_id} · ${segment.name}`,
  })
  if (error || !data) {
    console.warn("Resend segment create failed:", error?.message ?? "unknown")
    return null
  }

  const { data: updated, error: updateError } = await supabase
    .from("campaign_segments")
    .update({
      resend_segment_id: data.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", segment.id)
    .select("*")
    .single()
  if (updateError) throw updateError
  return mapSegment(updated).resend_segment_id
}

/**
 * Resolve local filter → add/remove Resend memberships for one segment.
 */
export async function reconcileCampaignSegmentMembership(
  supabase: SupabaseClient,
  organizationId: number,
  segmentId: number
): Promise<{ matched: number; added: number; removed: number }> {
  const segment = await fetchCampaignSegment(supabase, organizationId, segmentId)
  if (!segment) {
    return { matched: 0, added: 0, removed: 0 }
  }

  const matched = await resolveCampaignSegmentContacts(
    supabase,
    organizationId,
    segment.filter_json
  )
  const desiredIds = new Set(
    matched
      .map((contact) => contact.resend_contact_id)
      .filter((id): id is string => id != null)
  )

  const resendSegmentId = await ensureResendSegmentId(supabase, segment)
  if (!resendSegmentId) {
    return { matched: matched.length, added: 0, removed: 0 }
  }

  const resend = getResendClient()
  if (!resend) {
    return { matched: matched.length, added: 0, removed: 0 }
  }

  const currentIds = await listResendSegmentContactIds(resendSegmentId)
  let added = 0
  let removed = 0

  for (const contactId of desiredIds) {
    if (currentIds.has(contactId)) continue
    const { error } = await resend.contacts.segments.add({
      contactId,
      segmentId: resendSegmentId,
    })
    if (error) {
      console.warn("segment add failed:", error.message)
      continue
    }
    added += 1
  }

  for (const contactId of currentIds) {
    if (desiredIds.has(contactId)) continue
    const { error } = await resend.contacts.segments.remove({
      contactId,
      segmentId: resendSegmentId,
    })
    if (error) {
      console.warn("segment remove failed:", error.message)
      continue
    }
    removed += 1
  }

  const { error: stampError } = await supabase
    .from("campaign_segments")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", segment.id)
  if (stampError) throw stampError

  return { matched: matched.length, added, removed }
}

/** After Sync audience contacts: reconcile every org segment. */
export async function reconcileAllCampaignSegments(
  supabase: SupabaseClient,
  organizationId: number
): Promise<{ segments: number; added: number; removed: number }> {
  const segments = await fetchCampaignSegments(supabase, organizationId)
  let added = 0
  let removed = 0

  for (const segment of segments) {
    try {
      const result = await reconcileCampaignSegmentMembership(
        supabase,
        organizationId,
        segment.id
      )
      added += result.added
      removed += result.removed
    } catch (error) {
      console.warn(
        `reconcile segment ${segment.id} failed:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  return { segments: segments.length, added, removed }
}

export { emptyCampaignSegmentFilter }
