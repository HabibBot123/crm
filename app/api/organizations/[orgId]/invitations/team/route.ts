import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { badRequest, conflict, forbidden, ok, unauthorized, serverError } from "@/lib/api-helpers/api-response"
import { inviteTeamMember } from "@/lib/services/team"

type RouteContext = {
  params: Promise<{
    orgId: string
  }>
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

  let body: { email?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const role = typeof body.role === "string" ? body.role.trim() : ""

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

  const { data: membership, error: membershipError } = await serverClient
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (membershipError) {
    return serverError("Unable to verify membership", membershipError.message)
  }

  if (!membership) {
    return forbidden("You are not a member of this organization.")
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return forbidden("Only owner or admin can invite team members.")
  }

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
        role: role as any,
      },
      {
        id: user.id,
        fullName: (user.user_metadata?.full_name as string | null) ?? null,
      },
      (org?.name as string | null) ?? null,
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

