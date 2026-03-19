import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  badRequest,
  forbidden,
  ok,
  unauthorized,
  serverError,
} from "@/lib/api-helpers/api-response"
import {
  groupClientEnrollmentRows,
  type ClientEnrollmentRow,
  type ClientSummary,
  type ClientWithEnrollments,
} from "@/lib/services/clients"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

function escapeIlike(q: string): string {
  return q
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/'/g, "''")
}

export async function GET(request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = Number(orgId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }

  const url = new URL(request.url)
  const clientKeyParam = url.searchParams.get("clientKey")
  const pageParam = url.searchParams.get("page")
  const pageSizeParam = url.searchParams.get("pageSize")
  const searchParam = url.searchParams.get("search") ?? ""

  const page = Math.max(1, Number(pageParam) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    return serverError("Unable to verify membership", membershipError.message)
  }

  if (!membership || membership.status !== "active") {
    return forbidden("You are not an active member of this organization.")
  }

  const admin = createAdminClient()

  if (clientKeyParam?.trim()) {
    const clientKey = clientKeyParam.trim()
    const { data: enrollmentsData, error: enrError } = await admin
      .from("enrollments")
      .select(
        "id, organization_id, offer_id, user_id, buyer_email, status, started_at, expires_at, created_at, updated_at, offers(title), users(full_name, email)"
      )
      .eq("organization_id", organizationId)
      .or(`user_id.eq.${clientKey},buyer_email.eq.${clientKey}`)
      .order("started_at", { ascending: false })

    if (enrError) {
      return serverError("Failed to load client detail", enrError.message)
    }

    const enrollments = (enrollmentsData ?? []) as Array<{
      id: number
      organization_id: number
      offer_id: number
      user_id: string | null
      buyer_email: string | null
      status: string
      started_at: string
      expires_at: string | null
      created_at: string
      updated_at: string
      offers: { title: string } | { title: string }[] | null
      users: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
    }>

    if (enrollments.length === 0) {
      return ok({ client: null })
    }

    const rows: ClientEnrollmentRow[] = enrollments.map((e) => {
      const offer = Array.isArray(e.offers) ? e.offers[0] : e.offers
      const user = Array.isArray(e.users) ? e.users[0] : e.users
      const offerTitle = offer?.title ?? ""
      const fullName = user?.full_name ?? null
      const userEmail = user?.email ?? null
      return {
        organization_id: e.organization_id,
        enrollment_id: e.id,
        offer_id: e.offer_id,
        offer_title: offerTitle,
        user_id: e.user_id,
        buyer_email: e.buyer_email,
        client_name: fullName,
        client_email: userEmail,
        client_display: fullName ?? e.buyer_email ?? "—",
        enrollment_status: e.status as ClientEnrollmentRow["enrollment_status"],
        enrollment_started_at: e.started_at,
        enrollment_expires_at: e.expires_at,
        enrollment_created_at: e.created_at,
        enrollment_updated_at: e.updated_at,
        total_spent: 0,
      }
    })

    const grouped = groupClientEnrollmentRows(rows)
    const client: ClientWithEnrollments | null = grouped[0] ?? null

    return ok({ client })
  }

  let query = admin
    .from("v_organization_clients")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("first_enrollment_started_at", { ascending: false })
    .range(from, to)

  if (searchParam.trim()) {
    const q = escapeIlike(searchParam.trim())
    const orFilter = `client_display.ilike.%${q}%,client_email.ilike.%${q}%`
    query = query.or(orFilter)
  }

  const { data, error, count } = await query

  if (error) {
    return serverError("Failed to load clients", error.message)
  }

  const items = (data ?? []) as ClientSummary[]
  return ok({ items, total: count ?? 0 })
}
