import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { badRequest, forbidden, ok, unauthorized, serverError } from "@/lib/api-helpers/api-response"

type RouteContext = {
  params: Promise<{
    orgId: string
  }>
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
  let query = admin
    .from("v_organization_members")
    .select(
      "id, organization_id, user_id, email, full_name, role, status, invited_at, accepted_at, revoked_at, created_at",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (searchParam.trim()) {
    const q = escapeIlike(searchParam.trim())
    // Search on both `full_name` and `email`.
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error, count } = await query

  if (error) {
    return serverError("Failed to load team members", error.message)
  }

  return ok({
    items: (data ?? []) as Array<{
      id: number
      organization_id: number
      user_id: string | null
      email: string | null
      full_name: string | null
      role: string
      status: string
      invited_at: string | null
      accepted_at: string | null
      revoked_at: string | null
      created_at: string
    }>,
    total: count ?? 0,
  })
}

