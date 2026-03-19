import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from "@/lib/api-helpers/api-response"

const INVITATION_MAX_AGE_DAYS = 7

async function loadInvitationByToken(admin = createAdminClient(), token: string) {
  const { data, error } = await admin
    .from("organization_members")
    .select("id, email, status, invited_at, organization_id, organizations ( name )")
    .eq("invitation_token", token)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data as {
    id: number
    email: string | null
    status: string
    invited_at: string | null
    organization_id: number
    organizations: { name: string | null } | { name: string | null }[] | null
  } | null
}

function validateInvitation(invitation: { status: string; invited_at: string | null }) {
  if (invitation.status !== "invited") {
    return badRequest("This invitation has already been used or is no longer valid.")
  }

  if (!invitation.invited_at) {
    return badRequest("This invitation is misconfigured.")
  }

  const invitedAt = new Date(invitation.invited_at)
  if (Number.isNaN(invitedAt.getTime())) {
    return badRequest("This invitation is misconfigured.")
  }

  const ageMs = Date.now() - invitedAt.getTime()
  const maxAgeMs = INVITATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  if (ageMs > maxAgeMs) {
    return forbidden("This invitation has expired. Please ask your coach to send a new one.")
  }

  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = (url.searchParams.get("token") ?? "").trim()
  if (!token) {
    return badRequest("Invitation token is required")
  }

  const admin = createAdminClient()
  let invitation
  try {
    invitation = await loadInvitationByToken(admin, token)
  } catch (e) {
    const message =
      e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Failed to load invitation"
    return serverError(message)
  }

  if (!invitation) {
    return notFound("Invitation not found")
  }

  const errorResponse = validateInvitation(invitation)
  if (errorResponse) return errorResponse

  const org = Array.isArray(invitation.organizations)
    ? invitation.organizations[0] ?? null
    : invitation.organizations

  return ok({
    email: invitation.email,
    organization_id: invitation.organization_id,
    organization_name: org?.name ?? null,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const token = typeof body.token === "string" ? body.token.trim() : ""
  if (!token) {
    return badRequest("Invitation token is required")
  }

  const admin = createAdminClient()

  let invitation
  try {
    invitation = await loadInvitationByToken(admin, token)
  } catch (e) {
    const message =
      e && typeof (e as { message?: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Failed to load invitation"
    return serverError(message)
  }

  if (!invitation) {
    return notFound("Invitation not found")
  }

  const errorResponse = validateInvitation(invitation)
  if (errorResponse) return errorResponse

  const userEmail = user.email?.toLowerCase() ?? ""
  const invitedEmail = (invitation.email ?? "").toLowerCase()
  if (!userEmail || !invitedEmail || userEmail !== invitedEmail) {
    return forbidden("This invitation was sent to a different email address.")
  }

  const { error: updateError } = await admin
    .from("organization_members")
    .update({
      user_id: user.id,
      status: "active",
      accepted_at: new Date().toISOString(),
      invitation_token: null,
    })
    .eq("id", invitation.id)

  if (updateError) {
    return serverError("Failed to accept invitation", updateError.message)
  }

  return ok({
    success: true,
    organization_id: invitation.organization_id,
  })
}

