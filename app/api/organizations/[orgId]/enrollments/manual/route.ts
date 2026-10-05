import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  unauthorized,
} from "@/lib/api-helpers/api-response"
import { createManualEnrollment } from "@/lib/services/enrollments"
import { createManualEnrollmentSchema } from "@/schemas/enrollments.schema"

type RouteContext = {
  params: Promise<{ orgId: string }>
}

export async function POST(request: Request, context: RouteContext) {
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

  const access = await assertOrgCapability(supabase, organizationId, "clients.enroll_manual")
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = createManualEnrollmentSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  const admin = createAdminClient()

  try {
    const result = await createManualEnrollment({
      supabase: admin,
      organizationId,
      offerId: parsed.data.offerId,
      buyerEmail: parsed.data.buyerEmail,
      buyerName: parsed.data.buyerName ?? null,
      priceCents: parsed.data.priceCents ?? null,
      accessDurationMonths:
        parsed.data.accessDurationMonths === undefined
          ? undefined
          : parsed.data.accessDurationMonths,
    })
    return ok({ enrollment: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create enrollment"
    return badRequest(message)
  }
}
