import type { SupabaseClient } from "@supabase/supabase-js"
import { syncDeliveryCommissionOnAssign } from "@/lib/services/commissions"

/** PostgREST often returns relations as arrays; take first element. */
function first<T>(x: T | T[] | null): T | null {
  return x == null ? null : Array.isArray(x) ? x[0] ?? null : x
}

/** Extract full_name from an embedded `profiles` relation (object or array). */
function fullNameFrom(
  p: { full_name: string | null } | { full_name: string | null }[] | null | undefined
): string | null {
  if (p == null) return null
  const o = Array.isArray(p) ? p[0] : p
  return o?.full_name ?? null
}

export type CoachingEnrollmentProduct = {
  enrollment_product_id: number
  enrollment_id: number
  product_id: number
  product_title: string
  offer_title: string
  user_id: string | null
  buyer_email: string | null
  user_full_name: string
  user_mail: string
  enrollment_started_at: string
  enrollment_expires_at: string | null
  enrollment_status: string
  coach_full_name: string | null
  completion_total: number | null
  completion_completed: number | null
  product_completed_at: string | null
  session_count: number
  paid_delivery_count: number
  coach_editable: boolean
}

export type OrganizationMemberForSelect = {
  id: number
  user_id: string
  role: string
  display_name: string | null
}

export type CoachingSessionRow = {
  id: number
  enrollment_product_id: number
  coaching_assignment_id: number
  user_id: string
  delivery_mode: string | null
  meeting_url: string | null
  location: string | null
  session_number: number | null
  scheduled_at: string
  duration_minutes: number
  completed_at: string | null
  product_title: string | null
  user_full_name: string | null
  coach_display: string | null
}

export type CreateCoachingSessionPayload = {
  organization_id: number
  enrollment_product_id: number
  coaching_assignment_id: number
  user_id: string
  delivery_mode?: string | null
  meeting_url?: string | null
  location?: string | null
  session_number?: number | null
  scheduled_at: string
  duration_minutes: number
}

/** Returns the coaching assignment for an enrollment product (e.g. for creating a session). */
export async function getCoachingAssignmentForEnrollmentProduct(
  supabase: SupabaseClient,
  enrollmentProductId: number
): Promise<{ id: number } | null> {
  const { data, error } = await supabase
    .from("coaching_assignments")
    .select("id")
    .eq("enrollment_product_id", enrollmentProductId)
    .maybeSingle()
  if (error) throw error
  return data as { id: number } | null
}

/** Row shape from v_coaching_packs (ops history; includes expired/cancelled). */
type VCoachingPackRow = {
  user_id: string | null
  organization_id: number
  enrollment_id: number
  enrollment_product_id: number
  offer_title: string
  started_at: string
  expires_at: string | null
  enrollment_status: string
  product_id: number
  product_title: string
  product_type: string
  user_full_name: string
  user_mail: string
  coach_full_name: string | null
  completion_total: number | null
  completion_completed: number | null
  product_completed_at: string | null
}

export type CoachingPackAssignmentFilter =
  | "unassigned"
  | "assigned"
  | "waiting_signup"

export type CoachingPackEnrollmentStatus =
  | "active"
  | "paused"
  | "expired"
  | "cancelled"

export type FetchCoachingPacksOptions = {
  page: number
  pageSize: number
  search?: string
  assignmentFilters?: CoachingPackAssignmentFilter[]
  enrollmentStatuses?: CoachingPackEnrollmentStatus[]
}

export async function fetchCoachingEnrollmentProductsForOrg(
  supabase: SupabaseClient,
  organizationId: number,
  options: FetchCoachingPacksOptions
): Promise<{ items: CoachingEnrollmentProduct[]; total: number }> {
  const page = Math.max(1, options.page)
  const pageSize = Math.max(1, Math.min(100, options.pageSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = options.search?.trim() ?? ""
  const assignmentFilters = options.assignmentFilters ?? []
  const enrollmentStatuses = options.enrollmentStatuses ?? []

  let query = supabase
    .from("v_coaching_packs")
    .select(
      "user_id, organization_id, enrollment_id, enrollment_product_id, offer_title, started_at, expires_at, enrollment_status, product_id, product_title, product_type, user_full_name, user_mail, coach_full_name, completion_total, completion_completed, product_completed_at",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })
    .range(from, to)

  if (search.length > 0) {
    const pattern = `%${search}%`
    query = query.or(
      `user_full_name.ilike.${pattern},user_mail.ilike.${pattern},product_title.ilike.${pattern},offer_title.ilike.${pattern},coach_full_name.ilike.${pattern}`
    )
  }

  if (enrollmentStatuses.length > 0) {
    query = query.in("enrollment_status", enrollmentStatuses)
  }

  if (assignmentFilters.length === 1) {
    const only = assignmentFilters[0]
    if (only === "unassigned") {
      query = query.is("coach_full_name", null)
    } else if (only === "assigned") {
      query = query.not("coach_full_name", "is", null).not("user_id", "is", null)
    } else if (only === "waiting_signup") {
      query = query.not("coach_full_name", "is", null).is("user_id", null)
    }
  } else if (assignmentFilters.length > 1) {
    const parts: string[] = []
    if (assignmentFilters.includes("unassigned")) {
      parts.push("coach_full_name.is.null")
    }
    if (assignmentFilters.includes("assigned")) {
      parts.push("and(coach_full_name.not.is.null,user_id.not.is.null)")
    }
    if (assignmentFilters.includes("waiting_signup")) {
      parts.push("and(coach_full_name.not.is.null,user_id.is.null)")
    }
    if (parts.length > 0) {
      query = query.or(parts.join(","))
    }
  }

  const { data: viewData, error: viewError, count } = await query

  if (viewError) throw viewError
  const rows = (viewData ?? []) as VCoachingPackRow[]
  const base = rows.map(rowToPack)
  const enriched = await enrichPacksCoachEditability(supabase, organizationId, base)
  return { items: enriched, total: count ?? 0 }
}

function rowToPack(r: VCoachingPackRow): CoachingEnrollmentProduct {
  return {
    enrollment_product_id: r.enrollment_product_id,
    enrollment_id: r.enrollment_id,
    product_id: r.product_id,
    product_title: r.product_title,
    offer_title: r.offer_title,
    user_id: r.user_id,
    buyer_email: null,
    user_full_name: r.user_full_name,
    user_mail: r.user_mail,
    enrollment_started_at: r.started_at,
    enrollment_expires_at: r.expires_at,
    enrollment_status: r.enrollment_status,
    coach_full_name: r.coach_full_name ?? null,
    completion_total: r.completion_total ?? null,
    completion_completed: r.completion_completed ?? null,
    product_completed_at: r.product_completed_at ?? null,
    session_count: 0,
    paid_delivery_count: 0,
    coach_editable: true,
  }
}

async function enrichPacksCoachEditability(
  supabase: SupabaseClient,
  organizationId: number,
  packs: CoachingEnrollmentProduct[]
): Promise<CoachingEnrollmentProduct[]> {
  if (packs.length === 0) return packs

  const epIds = packs.map((p) => p.enrollment_product_id)
  const enrollmentIds = packs.map((p) => p.enrollment_id)

  const { data: sessionRows, error: sessionError } = await supabase
    .from("coaching_sessions")
    .select("enrollment_product_id")
    .eq("organization_id", organizationId)
    .in("enrollment_product_id", epIds)
  if (sessionError) throw sessionError

  const sessionCountByEp = new Map<number, number>()
  for (const row of sessionRows ?? []) {
    const epId = row.enrollment_product_id
    if (typeof epId !== "number") continue
    sessionCountByEp.set(epId, (sessionCountByEp.get(epId) ?? 0) + 1)
  }

  const { data: paidRows, error: paidError } = await supabase
    .from("commissions")
    .select("enrollment_id")
    .eq("organization_id", organizationId)
    .eq("pool", "delivery")
    .eq("status", "paid")
    .in("enrollment_id", enrollmentIds)
  if (paidError) throw paidError

  const paidCountByEnrollment = new Map<number, number>()
  for (const row of paidRows ?? []) {
    const enrollmentId = row.enrollment_id
    if (typeof enrollmentId !== "number") continue
    paidCountByEnrollment.set(
      enrollmentId,
      (paidCountByEnrollment.get(enrollmentId) ?? 0) + 1
    )
  }

  return packs.map((pack) => {
    const sessionCount = sessionCountByEp.get(pack.enrollment_product_id) ?? 0
    const paidDeliveryCount = paidCountByEnrollment.get(pack.enrollment_id) ?? 0
    return {
      ...pack,
      session_count: sessionCount,
      paid_delivery_count: paidDeliveryCount,
      coach_editable: sessionCount === 0 && paidDeliveryCount === 0,
    }
  })
}

/** Throws if coach cannot be changed/removed (sessions exist or paid delivery coms). */
export async function assertCoachAssignmentMutable(
  supabase: SupabaseClient,
  organizationId: number,
  enrollmentProductId: number,
  enrollmentId: number
): Promise<void> {
  const { count: sessionCount, error: sessionError } = await supabase
    .from("coaching_sessions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("enrollment_product_id", enrollmentProductId)
  if (sessionError) throw sessionError
  if ((sessionCount ?? 0) > 0) {
    throw new Error("Cannot change coach after sessions have been logged.")
  }

  const { count: paidCount, error: paidError } = await supabase
    .from("commissions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("enrollment_id", enrollmentId)
    .eq("pool", "delivery")
    .eq("status", "paid")
  if (paidError) throw paidError
  if ((paidCount ?? 0) > 0) {
    throw new Error("Cannot change coach while delivery commissions are marked paid.")
  }
}

async function deletePendingDeliveryCommissions(
  supabase: SupabaseClient,
  organizationId: number,
  enrollmentId: number
): Promise<number> {
  const { data, error } = await supabase
    .from("commissions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("enrollment_id", enrollmentId)
    .eq("pool", "delivery")
    .eq("status", "pending")
    .select("id")
  if (error) throw error
  return data?.length ?? 0
}

async function resolveEnrollmentIdForProduct(
  supabase: SupabaseClient,
  enrollmentProductId: number
): Promise<number> {
  const { data, error } = await supabase
    .from("enrollment_products")
    .select("enrollment_id")
    .eq("id", enrollmentProductId)
    .maybeSingle()
  if (error) throw error
  const enrollmentId = data?.enrollment_id
  if (typeof enrollmentId !== "number") {
    throw new Error("Enrollment product has no enrollment.")
  }
  return enrollmentId
}

export async function fetchOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrganizationMemberForSelect[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, profiles(full_name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("id", { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as {
    id: number
    user_id: string
    role: string
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    role: r.role,
    display_name: fullNameFrom(r.profiles),
  }))
}

type SessionProfileRow = { full_name: string | null } | { full_name: string | null }[] | null
type SessionEpRow = {
  products: { title: string } | { title: string }[] | null
  enrollments:
    | {
        user_id: string | null
        buyer_email: string | null
        buyer_name: string | null
        profiles: SessionProfileRow
      }
    | {
        user_id: string | null
        buyer_email: string | null
        buyer_name: string | null
        profiles: SessionProfileRow
      }[]
    | null
}
type SessionCaRow = {
  organization_members:
    | { user_id: string; profiles: SessionProfileRow }
    | { user_id: string; profiles: SessionProfileRow }[]
    | null
}
type SessionQueryRow = {
  id: number
  enrollment_product_id: number
  coaching_assignment_id: number
  user_id: string
  delivery_mode: string | null
  meeting_url: string | null
  location: string | null
  session_number: number | null
  scheduled_at: string
  duration_minutes: number
  completed_at: string | null
  enrollment_products: SessionEpRow | SessionEpRow[] | null
  coaching_assignments: SessionCaRow | SessionCaRow[] | null
}

const SESSION_SELECT = `
  id,
  enrollment_product_id,
  coaching_assignment_id,
  user_id,
  delivery_mode,
  meeting_url,
  location,
  session_number,
  scheduled_at,
  duration_minutes,
  completed_at,
  enrollment_products ( products ( title ), enrollments ( user_id, buyer_email, buyer_name, profiles ( full_name ) ) ),
  coaching_assignments ( organization_members ( user_id, profiles ( full_name ) ) )
`

function mapSessionQueryRow(s: SessionQueryRow): CoachingSessionRow {
  const ep = first(s.enrollment_products)
  const enr = first(ep?.enrollments)
  const clientDisplay =
    fullNameFrom(enr?.profiles) ?? enr?.buyer_name ?? enr?.buyer_email ?? "Unknown"
  const ca = first(s.coaching_assignments)
  const om = first(ca?.organization_members)
  const coachDisplay = fullNameFrom(om?.profiles) ?? null
  const prod = ep?.products
  const productTitle = prod
    ? (Array.isArray(prod) ? prod[0]?.title : prod.title) ?? null
    : null
  return {
    id: s.id,
    enrollment_product_id: s.enrollment_product_id,
    coaching_assignment_id: s.coaching_assignment_id,
    user_id: s.user_id,
    delivery_mode: s.delivery_mode,
    meeting_url: s.meeting_url,
    location: s.location,
    session_number: s.session_number,
    scheduled_at: s.scheduled_at,
    duration_minutes: s.duration_minutes,
    completed_at: s.completed_at,
    product_title: productTitle,
    user_full_name: clientDisplay,
    coach_display: coachDisplay,
  }
}

export async function fetchCoachingSessionsForOrg(
  supabase: SupabaseClient,
  organizationId: number,
  page: number,
  pageSize: number
): Promise<{ items: CoachingSessionRow[]; total: number }> {
  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from("coaching_sessions")
    .select(SESSION_SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: true })
    .range(from, to)

  if (error) throw error

  const sessions = (data ?? []) as unknown as SessionQueryRow[]
  return {
    items: sessions.map(mapSessionQueryRow),
    total: count ?? 0,
  }
}

/** Sessions for one coaching pack (sheet view). */
export async function fetchCoachingSessionsForEnrollmentProduct(
  supabase: SupabaseClient,
  organizationId: number,
  enrollmentProductId: number
): Promise<CoachingSessionRow[]> {
  const { data, error } = await supabase
    .from("coaching_sessions")
    .select(SESSION_SELECT)
    .eq("organization_id", organizationId)
    .eq("enrollment_product_id", enrollmentProductId)
    .order("scheduled_at", { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as SessionQueryRow[]).map(mapSessionQueryRow)
}

export async function upsertCoachingAssignment(
  supabase: SupabaseClient,
  enrollmentProductId: number,
  organizationMemberId: number,
  organizationId?: number,
  commission?: { rate?: number | null; fixed?: number | null }
): Promise<{ createdCount: number }> {
  if (organizationId != null) {
    const enrollmentId = await resolveEnrollmentIdForProduct(
      supabase,
      enrollmentProductId
    )
    const { data: existing } = await supabase
      .from("coaching_assignments")
      .select("id")
      .eq("enrollment_product_id", enrollmentProductId)
      .maybeSingle()
    if (existing != null) {
      await assertCoachAssignmentMutable(
        supabase,
        organizationId,
        enrollmentProductId,
        enrollmentId
      )
    }
  }

  const { error } = await supabase.from("coaching_assignments").upsert(
    {
      enrollment_product_id: enrollmentProductId,
      organization_member_id: organizationMemberId,
    },
    { onConflict: "enrollment_product_id" }
  )
  if (error) throw error

  if (organizationId == null) {
    return { createdCount: 0 }
  }

  return syncDeliveryCommissionOnAssign(supabase, {
    organizationId,
    enrollmentProductId,
    coachMemberId: organizationMemberId,
    rate: commission?.rate,
    fixed: commission?.fixed,
  })
}

/** Remove coach + delete pending delivery commissions. Blocked if sessions or paid coms. */
export async function removeCoachingAssignment(
  supabase: SupabaseClient,
  organizationId: number,
  enrollmentProductId: number
): Promise<{ deletedCommissions: number }> {
  const enrollmentId = await resolveEnrollmentIdForProduct(
    supabase,
    enrollmentProductId
  )
  await assertCoachAssignmentMutable(
    supabase,
    organizationId,
    enrollmentProductId,
    enrollmentId
  )

  const deletedCommissions = await deletePendingDeliveryCommissions(
    supabase,
    organizationId,
    enrollmentId
  )

  const { error } = await supabase
    .from("coaching_assignments")
    .delete()
    .eq("enrollment_product_id", enrollmentProductId)
  if (error) throw error

  return { deletedCommissions }
}

export async function createCoachingSession(
  supabase: SupabaseClient,
  payload: CreateCoachingSessionPayload
): Promise<{ id: number }> {
  if (!payload.user_id || payload.user_id.trim() === "") {
    throw new Error("The coached has not created their account after purchase yet. A session can only be created once they have signed up.")
  }
  if (payload.coaching_assignment_id == null || payload.coaching_assignment_id <= 0) {
    throw new Error("A coach must be assigned to the pack to create a session.")
  }

  const { data: packQuota, error: packQuotaError } = await supabase
    .from("v_coaching_packs")
    .select(
      "completion_total, completion_completed, product_completed_at"
    )
    .eq("enrollment_product_id", payload.enrollment_product_id)
    .maybeSingle()
  if (packQuotaError) throw packQuotaError

  const quotaTotal =
    typeof packQuota?.completion_total === "number"
      ? packQuota.completion_total
      : null
  const quotaDone =
    typeof packQuota?.completion_completed === "number"
      ? packQuota.completion_completed
      : 0
  const productCompleted =
    typeof packQuota?.product_completed_at === "string"

  if (productCompleted) {
    throw new Error("This coaching pack is completed. No more sessions can be added.")
  }

  const { count: existingCount, error: countError } = await supabase
    .from("coaching_sessions")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_product_id", payload.enrollment_product_id)
  if (countError) throw countError

  if (
    quotaTotal != null &&
    quotaTotal > 0 &&
    ((existingCount ?? 0) >= quotaTotal || quotaDone >= quotaTotal)
  ) {
    throw new Error("All planned sessions for this pack have been used.")
  }

  let sessionNumber = payload.session_number ?? null
  if (sessionNumber == null) {
    const { data: maxRow } = await supabase
      .from("coaching_sessions")
      .select("session_number")
      .eq("enrollment_product_id", payload.enrollment_product_id)
      .order("session_number", { ascending: false })
      .limit(1)
      .maybeSingle()
    const max = (maxRow as { session_number: number | null } | null)?.session_number
    sessionNumber = (typeof max === "number" ? max : 0) + 1
  }

  const { data, error } = await supabase
    .from("coaching_sessions")
    .insert({
      organization_id: payload.organization_id,
      enrollment_product_id: payload.enrollment_product_id,
      coaching_assignment_id: payload.coaching_assignment_id,
      user_id: payload.user_id,
      delivery_mode: payload.delivery_mode ?? null,
      meeting_url: payload.meeting_url ?? null,
      location: payload.location ?? null,
      session_number: sessionNumber,
      scheduled_at: payload.scheduled_at,
      duration_minutes: payload.duration_minutes,
    })
    .select("id")
    .single()
  if (error) throw error
  return { id: (data as { id: number }).id }
}

export async function updateCoachingSessionCompleted(
  supabase: SupabaseClient,
  sessionId: number,
  completedAt: string | null
): Promise<void> {
  const { error } = await supabase
    .from("coaching_sessions")
    .update({ completed_at: completedAt })
    .eq("id", sessionId)
  if (error) throw error
}
