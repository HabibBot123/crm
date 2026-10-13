import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
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

/** PostgREST may return embedded `profiles` as one row or an array. */
function fullNameFromProfilesRelation(relation: unknown): string | null {
  if (relation == null) return null
  const row = Array.isArray(relation) ? relation[0] : relation
  if (row == null || typeof row !== "object" || !("full_name" in row)) return null
  const name = row.full_name
  if (name == null) return null
  if (typeof name === "string") return name
  return String(name)
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
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam) || 25))
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

  const access = await assertOrgCapability(supabase, organizationId, "clients.view")
  if (!access.ok) return access.response

  const admin = createAdminClient()

  if (clientKeyParam?.trim()) {
    const clientKey = clientKeyParam.trim()
    let enrollmentsQuery = admin
      .from("enrollments")
      .select(
        "id, organization_id, offer_id, user_id, buyer_email, status, started_at, expires_at, created_at, updated_at, offers(title), profiles(full_name)"
      )
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })

    if (clientKey.includes("@")) {
      enrollmentsQuery = enrollmentsQuery.eq("buyer_email", clientKey)
    } else {
      enrollmentsQuery = enrollmentsQuery.eq("user_id", clientKey)
    }

    const { data: enrollmentsData, error: enrError } = await enrollmentsQuery

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
      profiles: { full_name: string | null } | { full_name: string | null }[] | null
    }>

    if (enrollments.length === 0) {
      return ok({ client: null })
    }

    const rows: ClientEnrollmentRow[] = enrollments.map((e) => {
      const offer = Array.isArray(e.offers) ? e.offers[0] : e.offers
      const offerTitle = offer?.title ?? ""
      const fullName = fullNameFromProfilesRelation(e.profiles)
      return {
        organization_id: e.organization_id,
        enrollment_id: e.id,
        offer_id: e.offer_id,
        offer_title: offerTitle,
        user_id: e.user_id,
        client_name: fullName,
        client_email: e.buyer_email,
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
