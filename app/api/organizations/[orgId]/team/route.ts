import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { badRequest, forbidden, ok, unauthorized, serverError } from "@/lib/api-helpers/api-response"
import { isTeamMemberRole } from "@/lib/permissions/roles"
import type { TeamMemberRole, TeamMemberStatus } from "@/lib/services/team"

type RouteContext = {
  params: Promise<{
    orgId: string
  }>
}

function parseRolesQuery(raw: string | null): TeamMemberRole[] | { error: string } {
  if (raw == null || raw.trim() === "") return []
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const roles: TeamMemberRole[] = []
  for (const p of parts) {
    if (!isTeamMemberRole(p)) {
      return { error: `Invalid role: ${p}` }
    }
    roles.push(p)
  }
  return roles
}

function parseStatusQuery(raw: string | null): TeamMemberStatus | null | { error: string } {
  if (raw == null || raw.trim() === "") return null
  const s = raw.trim()
  if (s === "invited" || s === "active" || s === "revoked") return s
  return { error: "Invalid status (use invited, active, or revoked)" }
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
  const pageParam = url.searchParams.get("page")
  const pageSizeParam = url.searchParams.get("pageSize")
  const searchParam = (url.searchParams.get("search") ?? "").trim()
  const rolesResult = parseRolesQuery(url.searchParams.get("roles"))
  if ("error" in rolesResult) {
    return badRequest(rolesResult.error)
  }
  const rolesFilter = rolesResult

  const statusResult = parseStatusQuery(url.searchParams.get("status"))
  if (statusResult !== null && typeof statusResult === "object" && "error" in statusResult) {
    return badRequest(statusResult.error)
  }
  const statusFilter: TeamMemberStatus | null = statusResult === null ? null : statusResult

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
  let query = admin
    .from("v_organization_members")
    .select(
      "id, organization_id, user_id, email, full_name, role, status, invited_at, accepted_at, revoked_at, created_at, default_commission_rate_sales, default_commission_fixed_sales, default_commission_rate_ambassador, default_commission_fixed_ambassador, default_commission_rate_coach, default_commission_fixed_coach",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)

  if (rolesFilter.length > 0) {
    query = query.in("role", rolesFilter)
  }
  if (statusFilter !== null) {
    query = query.eq("status", statusFilter)
  }

  if (searchParam.trim()) {
    const q = escapeIlike(searchParam.trim())
    // Search on both `full_name` and `email`.
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  query = query.order("created_at", { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error) {
    return serverError("Failed to load team members", error.message)
  }

  return ok({
    items: (data ?? []).map((row) => ({
      id: Number(row.id),
      organization_id: Number(row.organization_id),
      user_id: typeof row.user_id === "string" ? row.user_id : null,
      email: typeof row.email === "string" ? row.email : null,
      full_name: typeof row.full_name === "string" ? row.full_name : null,
      role: String(row.role),
      status: String(row.status),
      invited_at: typeof row.invited_at === "string" ? row.invited_at : null,
      accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
      revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
      created_at: String(row.created_at),
      default_commission_rate_sales:
        row.default_commission_rate_sales == null ? null : Number(row.default_commission_rate_sales),
      default_commission_fixed_sales:
        row.default_commission_fixed_sales == null ? null : Number(row.default_commission_fixed_sales),
      default_commission_rate_ambassador:
        row.default_commission_rate_ambassador == null
          ? null
          : Number(row.default_commission_rate_ambassador),
      default_commission_fixed_ambassador:
        row.default_commission_fixed_ambassador == null
          ? null
          : Number(row.default_commission_fixed_ambassador),
      default_commission_rate_coach:
        row.default_commission_rate_coach == null ? null : Number(row.default_commission_rate_coach),
      default_commission_fixed_coach:
        row.default_commission_fixed_coach == null ? null : Number(row.default_commission_fixed_coach),
    })),
    total: count ?? 0,
  })
}

