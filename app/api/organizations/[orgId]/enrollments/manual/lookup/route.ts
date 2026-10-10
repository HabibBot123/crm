import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { lookupBuyerForManualEnrollment } from "@/lib/services/enrollments"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const organizationId = Number(orgId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  const access = await assertOrgCapability(
    supabase,
    organizationId,
    "clients.enroll_manual"
  )
  if (!access.ok) return access.response

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? ""
  if (!email.includes("@")) {
    return badRequest("Valid email is required")
  }

  try {
    const admin = createAdminClient()
    const result = await lookupBuyerForManualEnrollment(
      admin,
      organizationId,
      email
    )
    return ok(result)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to look up buyer"
    return badRequest(message)
  }
}
