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
  cover_image_url: string | null
  completion_completed: number | null
  completion_total: number | null
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
  "organization_id,organization_name,organization_slug,enrollment_id,enrollment_product_id,enrollment_status,started_at,expires_at,product_id,product_title,product_type,cover_image_url,completion_completed,completion_total,coach_full_name"

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
}

export type CoachedCoachingDetail = {
  enrollment_product_id: number
  organization_slug: string
  product_title: string
  sessions_past: CoachedCoachingSession[]
  sessions_upcoming: CoachedCoachingSession[]
  coach_full_name: string | null
}

/** Fetch coaching pack detail for the coached: sessions (past/upcoming) and coach info. */
/** Fetch coaching pack detail for the coached: one view query (pack meta) + one sessions query. */
export async function fetchCoachedCoachingDetail(
  supabase: SupabaseClient,
  userId: string,
  productId: number
): Promise<CoachedCoachingDetail | null> {
  const { data: packRow, error: packError } = await supabase
    .from("v_coached_products")
    .select("enrollment_product_id, organization_slug, coach_full_name, product_title")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .eq("product_type", "coaching")
    .maybeSingle()

  if (packError || !packRow) return null
  const pack = packRow as { enrollment_product_id: number; organization_slug: string; coach_full_name: string | null; product_title: string }

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("coaching_sessions")
    .select("id, scheduled_at, completed_at, meeting_url, location, session_number, duration_minutes, delivery_mode")
    .eq("enrollment_product_id", pack.enrollment_product_id)
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true })

  if (sessionsError) throw sessionsError
  const allSessions = (sessionsData ?? []) as CoachedCoachingSession[]
  const now = new Date().toISOString()

  return {
    enrollment_product_id: pack.enrollment_product_id,
    organization_slug: pack.organization_slug,
    product_title: pack.product_title ?? "Coaching",
    sessions_past: allSessions.filter((s) => s.scheduled_at < now),
    sessions_upcoming: allSessions.filter((s) => s.scheduled_at >= now),
    coach_full_name: pack.coach_full_name ?? null,
  }
}

/** Verify access and get enrollment_id + enrollment_product_id for a product; returns null if no access. */
export async function getCoachedEnrollmentForProduct(
  supabase: SupabaseClient,
  userId: string,
  productId: number
): Promise<{ enrollment_id: number; enrollment_product_id: number; organization_slug: string } | null> {
  const { data, error } = await supabase
    .from("v_coached_products")
    .select("enrollment_id, enrollment_product_id, organization_slug")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as { enrollment_id: number; enrollment_product_id: number; organization_slug: string }
  return {
    enrollment_id: row.enrollment_id,
    enrollment_product_id: row.enrollment_product_id,
    organization_slug: row.organization_slug,
  }
}

/** Fetch full course details for the coached player (modules, items, content with Bunny URLs). */
export async function fetchCoachedCourseDetails(
  supabase: SupabaseClient,
  userId: string,
  productId: number
): Promise<CoachedCourseDetails | null> {
  const access = await getCoachedEnrollmentForProduct(supabase, userId, productId)
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
    .eq("id", productId)
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
    product_id: productId,
    product_title: productRow.title,
    organization_name: orgName,
    organization_slug: orgSlug,
    enrollment_id: access.enrollment_id,
    enrollment_product_id: access.enrollment_product_id,
    product_modules,
  }
}

/** Fetch set of completed product_module_item ids for an enrollment. */
export async function fetchLessonProgress(
  supabase: SupabaseClient,
  userId: string,
  enrollmentId: number
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("course_lesson_progress")
    .select("product_module_item_id")
    .eq("user_id", userId)
    .eq("enrollment_id", enrollmentId)
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
