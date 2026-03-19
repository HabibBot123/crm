import type { SupabaseClient } from "@supabase/supabase-js"

/** PostgREST often returns relations as arrays; take first element. */
function first<T>(x: T | T[] | null): T | null {
  return x == null ? null : Array.isArray(x) ? x[0] ?? null : x
}

/** Extract full_name from a user relation (object or array). */
function fullNameFrom(
  u: { full_name: string | null } | { full_name: string | null }[] | null | undefined
): string | null {
  if (u == null) return null
  const o = Array.isArray(u) ? u[0] : u
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

/** Row shape from v_coached_products (coaching packs; view has coach_full_name only, no assignment ids). */
type VCoachedProductRow = {
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
}

export async function fetchCoachingEnrollmentProductsForOrg(
  supabase: SupabaseClient,
  organizationId: number,
  page: number,
  pageSize: number
): Promise<{ items: CoachingEnrollmentProduct[]; total: number }> {
  const from = Math.max(0, (page - 1) * pageSize)
  const to = from + pageSize - 1

  const { data: viewData, error: viewError, count } = await supabase
    .from("v_coached_products")
    .select(
      "user_id, organization_id, enrollment_id, enrollment_product_id, offer_title, started_at, expires_at, enrollment_status, product_id, product_title, product_type, user_full_name, user_mail, coach_full_name, completion_total, completion_completed",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .eq("product_type", "coaching")
    .order("started_at", { ascending: false })
    .range(from, to)

  if (viewError) throw viewError
  const rows = (viewData ?? []) as VCoachedProductRow[]
  return { items: rows.map(rowToPack), total: count ?? 0 }
}

function rowToPack(r: VCoachedProductRow): CoachingEnrollmentProduct {
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
  }
}

export async function fetchOrganizationMembers(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrganizationMemberForSelect[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, users(full_name)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("id", { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as {
    id: number
    user_id: string
    role: string
    users: { full_name: string | null } | { full_name: string | null }[] | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    role: r.role,
    display_name: fullNameFrom(r.users),
  }))
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
    .select(
      `
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
      enrollment_products ( products ( title ), enrollments ( user_id, buyer_email, users ( full_name ) ) ),
      coaching_assignments ( organization_members ( user_id, users ( full_name ) ) )
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: true })
    .range(from, to)

  if (error) throw error

  type UserRow = { full_name: string | null } | { full_name: string | null }[] | null
  type EpRow = {
    products: { title: string } | { title: string }[] | null
    enrollments:
      | { user_id: string | null; buyer_email: string | null; users: UserRow }
      | { user_id: string | null; buyer_email: string | null; users: UserRow }[]
      | null
  }
  type CaRow = {
    organization_members:
      | { user_id: string; users: UserRow }
      | { user_id: string; users: UserRow }[]
      | null
  }
  type SessionRow = {
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
    enrollment_products: EpRow | EpRow[] | null
    coaching_assignments: CaRow | CaRow[] | null
  }

  const sessions = (data ?? []) as unknown as SessionRow[]
  return {
    items: sessions.map((s) => {
      const ep = first(s.enrollment_products)
      const enr = first(ep?.enrollments)
      const clientDisplay = fullNameFrom(enr?.users) ?? enr?.buyer_email ?? "—"
      const ca = first(s.coaching_assignments)
      const om = first(ca?.organization_members)
      const coachDisplay = fullNameFrom(om?.users) ?? null
      const prod = ep?.products
      const productTitle = prod ? (Array.isArray(prod) ? prod[0]?.title : prod.title) ?? null : null
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
    }),
    total: count ?? 0,
  }
}

export async function upsertCoachingAssignment(
  supabase: SupabaseClient,
  enrollmentProductId: number,
  organizationMemberId: number
): Promise<void> {
  const { error } = await supabase.from("coaching_assignments").upsert(
    {
      enrollment_product_id: enrollmentProductId,
      organization_member_id: organizationMemberId,
    },
    { onConflict: "enrollment_product_id" }
  )
  if (error) throw error
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
