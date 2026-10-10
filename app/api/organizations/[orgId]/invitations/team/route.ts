import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import { badRequest, conflict, ok, unauthorized, serverError } from "@/lib/api-helpers/api-response"
import { isTeamMemberRole } from "@/lib/permissions/roles"
import { inviteTeamMember } from "@/lib/services/team"

type RouteContext = {
  params: Promise<{
    orgId: string
  }>
}

function parseOptionalRate(value: unknown, fieldName: string): number | null | { error: string } {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { error: `${fieldName} must be between 0 and 100` }
  }
  return n
}

function parseOptionalFixed(value: unknown, fieldName: string): number | null | { error: string } {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    return { error: `${fieldName} must be >= 0` }
  }
  return n
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = Number(orgId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }

  const serverClient = await createClient()
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  let body: {
    email?: string
    role?: string
    default_commission_rate_sales?: number | null
    default_commission_fixed_sales?: number | null
    default_commission_rate_ambassador?: number | null
    default_commission_fixed_ambassador?: number | null
    default_commission_rate_coach?: number | null
    default_commission_fixed_coach?: number | null
  }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const role = typeof body.role === "string" ? body.role.trim() : ""

  const rateSales = parseOptionalRate(body.default_commission_rate_sales, "default_commission_rate_sales")
  if (typeof rateSales === "object" && rateSales !== null && "error" in rateSales) {
    return badRequest(rateSales.error)
  }
  const fixedSales = parseOptionalFixed(body.default_commission_fixed_sales, "default_commission_fixed_sales")
  if (typeof fixedSales === "object" && fixedSales !== null && "error" in fixedSales) {
    return badRequest(fixedSales.error)
  }
  const rateAmbassador = parseOptionalRate(
    body.default_commission_rate_ambassador,
    "default_commission_rate_ambassador"
  )
  if (typeof rateAmbassador === "object" && rateAmbassador !== null && "error" in rateAmbassador) {
    return badRequest(rateAmbassador.error)
  }
  const fixedAmbassador = parseOptionalFixed(
    body.default_commission_fixed_ambassador,
    "default_commission_fixed_ambassador"
  )
  if (typeof fixedAmbassador === "object" && fixedAmbassador !== null && "error" in fixedAmbassador) {
    return badRequest(fixedAmbassador.error)
  }
  const rateCoach = parseOptionalRate(body.default_commission_rate_coach, "default_commission_rate_coach")
  if (typeof rateCoach === "object" && rateCoach !== null && "error" in rateCoach) {
    return badRequest(rateCoach.error)
  }
  const fixedCoach = parseOptionalFixed(body.default_commission_fixed_coach, "default_commission_fixed_coach")
  if (typeof fixedCoach === "object" && fixedCoach !== null && "error" in fixedCoach) {
    return badRequest(fixedCoach.error)
  }

  if (!email || !role) {
    return badRequest("Email and role are required")
  }

  const normalizedEmail = email.toLowerCase()

  const userEmail = user.email?.toLowerCase() ?? null
  if (userEmail && normalizedEmail === userEmail) {
    return conflict("You can't invite yourself.")
  }

  const adminClient = createAdminClient()
  const { origin } = new URL(request.url)

  const { data: existing, error: existingError } = await adminClient
    .from("organization_members")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existingError) {
    return serverError("Unable to check existing invitations", existingError.message)
  }

  if (existing) {
    if (existing.status === "invited") {
      return conflict("This email has already been invited to your team.")
    }
    return conflict("This email is already a member of your team.")
  }

  const access = await assertOrgCapability(serverClient, organizationId, "team.invite")
  if (!access.ok) return access.response

  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .maybeSingle()

  if (orgError) {
    return serverError("Unable to load organization", orgError.message)
  }

  try {
    await inviteTeamMember(
      adminClient,
      {
        organizationId,
        email: normalizedEmail,
        role: role && isTeamMemberRole(role) && role !== "owner" ? role : "staff",
        defaultCommissionRateSales: rateSales,
        defaultCommissionFixedSales: fixedSales,
        defaultCommissionRateAmbassador: rateAmbassador,
        defaultCommissionFixedAmbassador: fixedAmbassador,
        defaultCommissionRateCoach: rateCoach,
        defaultCommissionFixedCoach: fixedCoach,
      },
      {
        id: user.id,
        fullName:
          typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
      },
      typeof org?.name === "string" ? org.name : null,
      origin
    )
  } catch (error) {
    const message =
      error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Failed to create invitation"
    return serverError(message)
  }

  return ok({ success: true })
}
