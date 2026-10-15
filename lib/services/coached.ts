import type { SupabaseClient } from "@supabase/supabase-js"

export type CoachedOrg = {
  organization_id: number
  organization_name: string
  organization_slug: string
}

export type CoachedProduct = {
  organization_id: number
  organization_name: string
  organization_slug: string
  enrollment_id: number
  enrollment_product_id: number
  enrollment_status: string
  started_at: string | null
  expires_at: string | null
  product_id: number
  product_title: string
  product_type: string
  offer_title: string | null
  cover_image_url: string | null
  completion_completed: number | null
  completion_total: number | null
  product_completed_at: string | null
  coach_full_name: string | null
}

/** Content item with Bunny fields for course player (video embed, doc URL). */
export type CoachedCourseContentItem = {
  id: number
  name: string
  type: "video" | "pdf" | "word" | "excel" | "powerpoint"
  duration: number | null
  file_size: number | null
  upload_status: string | null
  bunny_library_id: string | null
  bunny_video_id: string | null
  bunny_storage_path: string | null
}

export type CoachedCourseModuleItem = {
  id: number
  product_module_id: number
  content_item_id: number
  title: string | null
  position: number
  content_items: CoachedCourseContentItem | null
}

export type CoachedCourseModule = {
  id: number
  product_id: number
  title: string
  position: number
  product_module_items: CoachedCourseModuleItem[]
}

export type CoachedCourseDetails = {
  product_id: number
  product_title: string
  organization_name: string
  organization_slug: string
  enrollment_id: number
  enrollment_product_id: number
  product_modules: CoachedCourseModule[]
}

/** Enrollment summary for coached profile (billing portal, list). */
export type CoachedEnrollment = {
  id: number
  organization_id: number
  organization_name: string
  offer_id: number
  offer_title: string
  status: string
  started_at: string
  expires_at: string | null
  stripe_customer_id: string | null
}

export type CoachedInvoice = {
  id: number
  organization_id: number
  organization_name: string
  offer_id: number | null
  offer_title: string | null
  amount_cents: number
  currency: string
  invoice_pdf_url: string | null
  status: string
  stripe_created_at: string | null
  created_at: string
}

type ProductModulesRow = {
  id: number
  product_id: number
  title: string
  position: number
  product_module_items: Array<{
    id: number
    product_module_id: number
    content_item_id: number
    title: string | null
    position: number
    content_items: CoachedCourseContentItem | CoachedCourseContentItem[] | null
  }>
}

type ProductRow = {
  id: number
  title: string
  organization_id: number
  product_modules: ProductModulesRow[]
}

type OrgRow = {
  name: string
  slug: string
}

const COACHED_PRODUCTS_COLUMNS =
  "organization_id,organization_name,organization_slug,enrollment_id,enrollment_product_id,enrollment_status,started_at,expires_at,product_id,product_title,product_type,offer_title,cover_image_url,completion_completed,completion_total,product_completed_at,coach_full_name"

type EnrollmentRow = {
  id: number
  organization_id: number
  offer_id: number
  status: string
  started_at: string
  expires_at: string | null
  stripe_customer_id: string | null
  offers: { title: string } | { title: string }[]
  organizations: { name: string } | { name: string }[]
}

/** Fetch current user's enrollments with offer and org info (profile / billing). */
export async function fetchCoachedEnrollments(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<CoachedEnrollment[]> {
  const { data: rows, error } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      organization_id,
      offer_id,
      status,
      started_at,
      expires_at,
      stripe_customer_id,
      offers(title),
      organizations(name)
    `
    )
    .or(`user_id.eq.${userId},buyer_email.eq.${email.toLowerCase()}`)
    .order("started_at", { ascending: false })

  if (error) throw error

  return (rows ?? []).map((r: EnrollmentRow) => ({
    id: r.id,
    organization_id: r.organization_id,
    organization_name: Array.isArray(r.organizations)
      ? (r.organizations[0]?.name ?? "—")
      : (r.organizations?.name ?? "—"),
    offer_id: r.offer_id,
    offer_title: Array.isArray(r.offers) ? (r.offers[0]?.title ?? "—") : (r.offers?.title ?? "—"),
    status: r.status,
    started_at: r.started_at,
    expires_at: r.expires_at,
    stripe_customer_id: r.stripe_customer_id,
  }))
}

type CoachedInvoiceRow = {
  id: number
  organization_id: number
  offer_id: number | null
  amount_cents: number
  currency: string
  invoice_pdf_url: string | null
  status: string
  stripe_created_at: string | null
  created_at: string
  organizations: { name: string } | { name: string }[] | null
  offers: { title: string } | { title: string }[] | null
}

/** Fetch current user's invoices (RLS filters by user_id or buyer_email). */
export async function fetchCoachedInvoices(
  supabase: SupabaseClient
): Promise<CoachedInvoice[]> {
  const { data: rows, error } = await supabase
    .from("coached_invoices")
    .select("id, organization_id, offer_id, amount_cents, currency, invoice_pdf_url, status, stripe_created_at, created_at, organizations(name), offers(title)")
    .order("stripe_created_at", { ascending: false })

  if (error) throw error

  return (rows ?? []).map((r: CoachedInvoiceRow) => ({
    id: r.id,
    organization_id: r.organization_id,
    organization_name: Array.isArray(r.organizations)
      ? (r.organizations[0]?.name ?? "—")
      : (r.organizations?.name ?? "—"),
    offer_id: r.offer_id,
    offer_title: r.offers == null
      ? null
      : Array.isArray(r.offers)
        ? (r.offers[0]?.title ?? null)
        : (r.offers?.title ?? null),
    amount_cents: r.amount_cents,
    currency: r.currency,
    invoice_pdf_url: r.invoice_pdf_url,
    status: r.status,
    stripe_created_at: r.stripe_created_at,
    created_at: r.created_at,
  }))
}

export async function fetchCoachedProducts(
  supabase: SupabaseClient,
  userId: string
): Promise<CoachedProduct[]> {
  const { data, error } = await supabase
    .from("v_coached_products")
    .select(COACHED_PRODUCTS_COLUMNS)
    .eq("user_id", userId)

  if (error) throw error
  return (data ?? []) as CoachedProduct[]
}

export function coachedOrgsFromProducts(products: CoachedProduct[]): CoachedOrg[] {
  const seen = new Set<number>()
  const orgs: CoachedOrg[] = []
  for (const p of products) {
    if (seen.has(p.organization_id)) continue
    seen.add(p.organization_id)
    orgs.push({
      organization_id: p.organization_id,
      organization_name: p.organization_name,
      organization_slug: p.organization_slug,
    })
  }
  return orgs
}

/** Session row for coached coaching detail (past/upcoming). */
export type CoachedCoachingSession = {
  id: number
  scheduled_at: string
  completed_at: string | null
  meeting_url: string | null
  location: string | null
  session_number: number | null
  duration_minutes: number
  delivery_mode: string | null
  notes: string | null
}

export type UpdateCoachedSessionInput = {
  scheduled_at?: string
  duration_minutes?: number
  delivery_mode?: string | null
  meeting_url?: string | null
  location?: string | null
  completed_at?: string | null
  notes?: string | null
}

export type CoachedCoachingDetail = {
  enrollment_product_id: number
  organization_id: number
  organization_slug: string
  product_title: string
  offer_title: string | null
  sessions_past: CoachedCoachingSession[]
  sessions_upcoming: CoachedCoachingSession[]
  coach_full_name: string | null
  coach_user_id: string | null
  coach_email: string | null
  coach_avatar_url: string | null
  client_user_id: string | null
  client_full_name: string | null
  client_email: string | null
  client_avatar_url: string | null
  coaching_assignment_id: number | null
  assigned_at: string | null
  started_at: string | null
  expires_at: string | null
  enrollment_status: string | null
  product_completed_at: string | null
  viewer_role: "client" | "coach"
  completion_total: number | null
  completion_completed: number | null
}

export type CoachedCoachPack = {
  enrollment_product_id: number
  organization_id: number
  organization_slug: string
  product_title: string
  client_full_name: string
  client_avatar_url: string | null
  completion_completed: number | null
  completion_total: number | null
  enrollment_status: string
  product_completed_at: string | null
  started_at: string | null
  expires_at: string | null
  cover_image_url: string | null
}

async function fetchProfileContact(
  supabase: SupabaseClient,
  userId: string | null
): Promise<{ full_name: string | null; avatar_url: string | null }> {
  if (!userId) return { full_name: null, avatar_url: null }
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return {
    full_name: typeof data?.full_name === "string" ? data.full_name : null,
    avatar_url: typeof data?.avatar_url === "string" ? data.avatar_url : null,
  }
}

async function fetchAssignmentForPack(
  supabase: SupabaseClient,
  enrollmentProductId: number
): Promise<{
  coaching_assignment_id: number | null
  coach_user_id: string | null
  coach_email: string | null
  coach_full_name: string | null
  coach_avatar_url: string | null
  assigned_at: string | null
}> {
  const { data, error } = await supabase
    .from("coaching_assignments")
    .select("id, coach_user_id, coach_email, created_at")
    .eq("enrollment_product_id", enrollmentProductId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return {
      coaching_assignment_id: null,
      coach_user_id: null,
      coach_email: null,
      coach_full_name: null,
      coach_avatar_url: null,
      assigned_at: null,
    }
  }
  const coachUserId =
    typeof data.coach_user_id === "string" ? data.coach_user_id : null
  const profile = await fetchProfileContact(supabase, coachUserId)
  return {
    coaching_assignment_id: typeof data.id === "number" ? data.id : null,
    coach_user_id: coachUserId,
    coach_email: typeof data.coach_email === "string" ? data.coach_email : null,
    coach_full_name: profile.full_name,
    coach_avatar_url: profile.avatar_url,
    assigned_at: typeof data.created_at === "string" ? data.created_at : null,
  }
}

/** Packs where the current user is the assigned coach (living enrollments). */
export async function fetchCoachingPacksAsCoach(
  supabase: SupabaseClient,
  organizationId: number,
  userId: string
): Promise<CoachedCoachPack[]> {
  const { data: assignments, error: assignError } = await supabase
    .from("coaching_assignments")
    .select("enrollment_product_id")
    .eq("coach_user_id", userId)
  if (assignError) throw assignError

  const ids = (assignments ?? [])
    .map((row) => row.enrollment_product_id)
    .filter((id): id is number => typeof id === "number")
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("v_coaching_packs")
    .select(
      "enrollment_product_id, organization_id, organization_slug, product_title, user_id, user_full_name, completion_completed, completion_total, enrollment_status, product_completed_at, started_at, expires_at, cover_image_url"
    )
    .eq("organization_id", organizationId)
    .in("enrollment_product_id", ids)
    .in("enrollment_status", ["active", "paused"])
    .order("started_at", { ascending: false })
  if (error) throw error

  const rows = data ?? []
  const clientUserIds = Array.from(
    new Set(
      rows
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string")
    )
  )
  const avatarByUserId = new Map<string, string>()
  if (clientUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, avatar_url")
      .in("user_id", clientUserIds)
    if (profilesError) throw profilesError
    for (const profile of profiles ?? []) {
      if (
        typeof profile.user_id === "string" &&
        typeof profile.avatar_url === "string"
      ) {
        avatarByUserId.set(profile.user_id, profile.avatar_url)
      }
    }
  }

  return rows.map((row) => {
    const clientUserId =
      typeof row.user_id === "string" ? row.user_id : null
    return {
      enrollment_product_id:
        typeof row.enrollment_product_id === "number"
          ? row.enrollment_product_id
          : 0,
      organization_id:
        typeof row.organization_id === "number"
          ? row.organization_id
          : organizationId,
      organization_slug:
        typeof row.organization_slug === "string" ? row.organization_slug : "",
      product_title:
        typeof row.product_title === "string" ? row.product_title : "Coaching",
      client_full_name:
        typeof row.user_full_name === "string" ? row.user_full_name : "Client",
      client_avatar_url: clientUserId
        ? (avatarByUserId.get(clientUserId) ?? null)
        : null,
      completion_completed:
        typeof row.completion_completed === "number"
          ? row.completion_completed
          : null,
      completion_total:
        typeof row.completion_total === "number" ? row.completion_total : null,
      enrollment_status:
        typeof row.enrollment_status === "string"
          ? row.enrollment_status
          : "active",
      product_completed_at:
        typeof row.product_completed_at === "string"
          ? row.product_completed_at
          : null,
      started_at: typeof row.started_at === "string" ? row.started_at : null,
      expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
      cover_image_url:
        typeof row.cover_image_url === "string" ? row.cover_image_url : null,
    }
  })
}

/** Fetch coaching pack detail for client or assigned coach. */
export async function fetchCoachedCoachingDetail(
  supabase: SupabaseClient,
  userId: string,
  enrollmentProductId: number
): Promise<CoachedCoachingDetail | null> {
  const assignment = await fetchAssignmentForPack(supabase, enrollmentProductId)

  const { data: clientPack, error: clientError } = await supabase
    .from("v_coached_products")
    .select(
      "enrollment_product_id, organization_id, organization_slug, coach_full_name, product_title, offer_title, user_id, user_mail, completion_total, completion_completed, started_at, expires_at, enrollment_status, product_completed_at"
    )
    .eq("user_id", userId)
    .eq("enrollment_product_id", enrollmentProductId)
    .eq("product_type", "coaching")
    .maybeSingle()
  if (clientError) throw clientError

  let viewerRole: "client" | "coach" | null = null
  let organizationId = 0
  let organizationSlug = ""
  let productTitle = "Coaching"
  let offerTitle: string | null = null
  let coachFullName = assignment.coach_full_name
  let clientUserId: string | null = null
  let clientFullName: string | null = null
  let clientEmail: string | null = null
  let startedAt: string | null = null
  let expiresAt: string | null = null
  let enrollmentStatus: string | null = null
  let productCompletedAt: string | null = null
  let completionTotal: number | null = null
  let completionCompleted: number | null = null

  if (clientPack) {
    viewerRole = "client"
    organizationId =
      typeof clientPack.organization_id === "number"
        ? clientPack.organization_id
        : 0
    organizationSlug =
      typeof clientPack.organization_slug === "string"
        ? clientPack.organization_slug
        : ""
    productTitle =
      typeof clientPack.product_title === "string"
        ? clientPack.product_title
        : "Coaching"
    offerTitle =
      typeof clientPack.offer_title === "string" ? clientPack.offer_title : null
    if (typeof clientPack.coach_full_name === "string") {
      coachFullName = clientPack.coach_full_name
    }
    clientUserId = userId
    clientEmail =
      typeof clientPack.user_mail === "string" && clientPack.user_mail.trim()
        ? clientPack.user_mail
        : null
    startedAt =
      typeof clientPack.started_at === "string" ? clientPack.started_at : null
    expiresAt =
      typeof clientPack.expires_at === "string" ? clientPack.expires_at : null
    enrollmentStatus =
      typeof clientPack.enrollment_status === "string"
        ? clientPack.enrollment_status
        : null
    productCompletedAt =
      typeof clientPack.product_completed_at === "string"
        ? clientPack.product_completed_at
        : null
    completionTotal =
      typeof clientPack.completion_total === "number"
        ? clientPack.completion_total
        : null
    completionCompleted =
      typeof clientPack.completion_completed === "number"
        ? clientPack.completion_completed
        : null
  } else if (assignment.coach_user_id === userId) {
    const { data: packRow, error: packError } = await supabase
      .from("v_coaching_packs")
      .select(
        "enrollment_product_id, organization_id, organization_slug, product_title, offer_title, user_id, user_full_name, user_mail, coach_full_name, completion_total, completion_completed, enrollment_status, product_completed_at, started_at, expires_at"
      )
      .eq("enrollment_product_id", enrollmentProductId)
      .maybeSingle()
    if (packError) throw packError
    if (!packRow) return null
    if (
      packRow.enrollment_status !== "active" &&
      packRow.enrollment_status !== "paused"
    ) {
      return null
    }
    viewerRole = "coach"
    organizationId =
      typeof packRow.organization_id === "number" ? packRow.organization_id : 0
    organizationSlug =
      typeof packRow.organization_slug === "string"
        ? packRow.organization_slug
        : ""
    productTitle =
      typeof packRow.product_title === "string"
        ? packRow.product_title
        : "Coaching"
    offerTitle =
      typeof packRow.offer_title === "string" ? packRow.offer_title : null
    if (typeof packRow.coach_full_name === "string") {
      coachFullName = packRow.coach_full_name
    }
    clientUserId =
      typeof packRow.user_id === "string" ? packRow.user_id : null
    clientFullName =
      typeof packRow.user_full_name === "string" ? packRow.user_full_name : null
    clientEmail =
      typeof packRow.user_mail === "string" && packRow.user_mail.trim()
        ? packRow.user_mail
        : null
    startedAt =
      typeof packRow.started_at === "string" ? packRow.started_at : null
    expiresAt =
      typeof packRow.expires_at === "string" ? packRow.expires_at : null
    enrollmentStatus =
      typeof packRow.enrollment_status === "string"
        ? packRow.enrollment_status
        : null
    productCompletedAt =
      typeof packRow.product_completed_at === "string"
        ? packRow.product_completed_at
        : null
    completionTotal =
      typeof packRow.completion_total === "number"
        ? packRow.completion_total
        : null
    completionCompleted =
      typeof packRow.completion_completed === "number"
        ? packRow.completion_completed
        : null
  }

  if (viewerRole == null) return null

  const clientProfile = await fetchProfileContact(supabase, clientUserId)
  if (viewerRole === "coach" && clientProfile.full_name) {
    clientFullName = clientProfile.full_name
  }

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("coaching_sessions")
    .select(
      "id, scheduled_at, completed_at, meeting_url, location, session_number, duration_minutes, delivery_mode, notes"
    )
    .eq("enrollment_product_id", enrollmentProductId)
    .order("scheduled_at", { ascending: true })
  if (sessionsError) throw sessionsError

  const allSessions = (sessionsData ?? []).map((row) => ({
    id: typeof row.id === "number" ? row.id : 0,
    scheduled_at: typeof row.scheduled_at === "string" ? row.scheduled_at : "",
    completed_at:
      typeof row.completed_at === "string" ? row.completed_at : null,
    meeting_url: typeof row.meeting_url === "string" ? row.meeting_url : null,
    location: typeof row.location === "string" ? row.location : null,
    session_number:
      typeof row.session_number === "number" ? row.session_number : null,
    duration_minutes:
      typeof row.duration_minutes === "number" ? row.duration_minutes : 0,
    delivery_mode:
      typeof row.delivery_mode === "string" ? row.delivery_mode : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  }))
  const now = new Date().toISOString()

  return {
    enrollment_product_id: enrollmentProductId,
    organization_id: organizationId,
    organization_slug: organizationSlug,
    product_title: productTitle,
    offer_title: offerTitle,
    sessions_past: allSessions.filter((s) => s.scheduled_at < now),
    sessions_upcoming: allSessions.filter((s) => s.scheduled_at >= now),
    coach_full_name: coachFullName ?? assignment.coach_full_name,
    coach_user_id: assignment.coach_user_id,
    coach_email: assignment.coach_email,
    coach_avatar_url: assignment.coach_avatar_url,
    client_user_id: clientUserId,
    client_full_name: clientFullName,
    client_email: clientEmail,
    client_avatar_url: clientProfile.avatar_url,
    coaching_assignment_id: assignment.coaching_assignment_id,
    assigned_at: assignment.assigned_at,
    started_at: startedAt,
    expires_at: expiresAt,
    enrollment_status: enrollmentStatus,
    product_completed_at: productCompletedAt,
    viewer_role: viewerRole,
    completion_total: completionTotal,
    completion_completed: completionCompleted,
  }
}

export async function updateCoachedSession(
  supabase: SupabaseClient,
  sessionId: number,
  input: UpdateCoachedSessionInput
): Promise<void> {
  const patch: Record<string, string | number | null> = {}
  if (input.scheduled_at !== undefined) patch.scheduled_at = input.scheduled_at
  if (input.duration_minutes !== undefined) {
    patch.duration_minutes = input.duration_minutes
  }
  if (input.delivery_mode !== undefined) {
    patch.delivery_mode = input.delivery_mode
  }
  if (input.meeting_url !== undefined) patch.meeting_url = input.meeting_url
  if (input.location !== undefined) patch.location = input.location
  if (input.completed_at !== undefined) patch.completed_at = input.completed_at
  if (input.notes !== undefined) patch.notes = input.notes

  const { error } = await supabase
    .from("coaching_sessions")
    .update(patch)
    .eq("id", sessionId)
  if (error) throw error
}

export async function deleteCoachedSession(
  supabase: SupabaseClient,
  sessionId: number
): Promise<void> {
  const { error } = await supabase
    .from("coaching_sessions")
    .delete()
    .eq("id", sessionId)
  if (error) throw error
}

/** Verify access by enrollment_product_id; returns null if no access. */
export async function getCoachedEnrollmentAccess(
  supabase: SupabaseClient,
  userId: string,
  enrollmentProductId: number
): Promise<{
  enrollment_id: number
  enrollment_product_id: number
  organization_slug: string
  product_id: number
} | null> {
  const { data, error } = await supabase
    .from("v_coached_products")
    .select("enrollment_id, enrollment_product_id, organization_slug, product_id")
    .eq("user_id", userId)
    .eq("enrollment_product_id", enrollmentProductId)
    .maybeSingle()

  if (error || !data) return null
  if (
    typeof data.enrollment_id !== "number" ||
    typeof data.enrollment_product_id !== "number" ||
    typeof data.organization_slug !== "string" ||
    typeof data.product_id !== "number"
  ) {
    return null
  }
  return {
    enrollment_id: data.enrollment_id,
    enrollment_product_id: data.enrollment_product_id,
    organization_slug: data.organization_slug,
    product_id: data.product_id,
  }
}

/** Fetch full course details for the coached player by enrollment_product_id. */
export async function fetchCoachedCourseDetails(
  supabase: SupabaseClient,
  userId: string,
  enrollmentProductId: number
): Promise<CoachedCourseDetails | null> {
  const access = await getCoachedEnrollmentAccess(supabase, userId, enrollmentProductId)
  if (!access) return null

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      `
      id,
      title,
      organization_id,
      product_modules(
        id,
        product_id,
        title,
        position,
        product_module_items(
          id,
          product_module_id,
          content_item_id,
          title,
          position,
          content_items(
            id,
            name,
            type,
            duration,
            file_size,
            upload_status,
            bunny_library_id,
            bunny_video_id,
            bunny_storage_path
          )
        )
      )
    `
    )
    .eq("id", access.product_id)
    .single()

  if (productError || !product) return null

  const org = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", (product as ProductRow).organization_id)
    .single()

  const orgRow = org.data as OrgRow | null
  const orgName = orgRow?.name ?? ""
  const orgSlug = orgRow?.slug ?? ""

  const productRow = product as ProductRow
  const rawModules = productRow.product_modules ?? []

  const product_modules: CoachedCourseModule[] = rawModules
    .sort((a, b) => a.position - b.position)
    .map((mod) => ({
      id: mod.id,
      product_id: mod.product_id,
      title: mod.title,
      position: mod.position,
      product_module_items: (mod.product_module_items ?? [])
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          product_module_id: item.product_module_id,
          content_item_id: item.content_item_id,
          title: item.title,
          position: item.position,
          content_items: Array.isArray(item.content_items)
            ? item.content_items[0] ?? null
            : item.content_items ?? null,
        })),
    }))

  return {
    product_id: access.product_id,
    product_title: productRow.title,
    organization_name: orgName,
    organization_slug: orgSlug,
    enrollment_id: access.enrollment_id,
    enrollment_product_id: access.enrollment_product_id,
    product_modules,
  }
}

/** Fetch set of completed product_module_item ids for an enrollment product. */
export async function fetchLessonProgress(
  supabase: SupabaseClient,
  userId: string,
  enrollmentProductId: number
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("course_lesson_progress")
    .select("product_module_item_id")
    .eq("user_id", userId)
    .eq("enrollment_product_id", enrollmentProductId)
    .not("completed_at", "is", null)

  if (error) return new Set()
  const ids = (data ?? []).map(
    (row: { product_module_item_id: number }) => row.product_module_item_id
  )
  return new Set(ids)
}

/** Mark a lesson as complete (upsert with completed_at = now). */
export async function markLessonComplete(
  supabase: SupabaseClient,
  userId: string,
  enrollmentProductId: number,
  productModuleItemId: number
): Promise<void> {
  const { error } = await supabase.from("course_lesson_progress").upsert(
    {
      user_id: userId,
      enrollment_product_id: enrollmentProductId,
      product_module_item_id: productModuleItemId,
      completed_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,enrollment_product_id,product_module_item_id",
    }
  )
  if (error) throw error
}
