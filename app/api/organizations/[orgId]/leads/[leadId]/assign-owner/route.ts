import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import {
  badRequest,
  ok,
  unauthorized,
  serverError,
} from "@/lib/api-helpers/api-response"
import { assignLeadOwnerSchema } from "@/schemas/crm.schema"
import { updateLeadOwner } from "@/lib/services/crm"
import { sendLeadOwnerAssignedEmail } from "@/lib/email/workflows/send-lead-owner-assigned-email"

type RouteContext = {
  params: Promise<{ orgId: string; leadId: string }>
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null
  const value = record[key]
  return typeof value === "string" ? value : null
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId, leadId } = await context.params
  const organizationId = Number(orgId)
  const leadIdNum = Number(leadId)
  if (!Number.isFinite(organizationId) || organizationId <= 0) {
    return badRequest("Invalid organization id")
  }
  if (!Number.isFinite(leadIdNum) || leadIdNum <= 0) {
    return badRequest("Invalid lead id")
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  const access = await assertOrgCapability(supabase, organizationId, "crm.assign_sales")
  if (!access.ok) return access.response

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = assignLeadOwnerSchema.safeParse(rawBody)
  if (!parsed.success) {
    return badRequest("Invalid payload", parsed.error.flatten())
  }

  const ownerId = parsed.data.owner_id

  if (ownerId != null) {
    const { data: memberRow, error: memberError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("id", ownerId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle()
    if (memberError) return serverError(memberError.message)
    if (!memberRow) return badRequest("Owner must be an active organization member")
  }

  try {
    const { previousOwnerId } = await updateLeadOwner(supabase, {
      leadId: leadIdNum,
      ownerId,
    })

    const shouldNotify =
      ownerId != null && previousOwnerId !== ownerId

    if (shouldNotify && ownerId != null) {
      const [{ data: lead }, { data: org }, { data: ownerMember }, { data: assignerProfile }] =
        await Promise.all([
          supabase
            .from("v_crm_leads")
            .select(
              "id, full_name, email, phone, status, form_title, offer_title, crm_fields_all"
            )
            .eq("id", leadIdNum)
            .eq("organization_id", organizationId)
            .maybeSingle(),
          supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
          supabase
            .from("organization_members")
            .select("email, user_id, profiles(full_name)")
            .eq("id", ownerId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle(),
        ])

      const ownerRecord = asRecord(ownerMember)
      let ownerEmail = readString(ownerRecord, "email")?.trim().toLowerCase() ?? ""
      const ownerUserId = readString(ownerRecord, "user_id")
      if (ownerEmail.length === 0 && ownerUserId) {
        try {
          const admin = createAdminClient()
          const { data: authUser, error: authUserError } =
            await admin.auth.admin.getUserById(ownerUserId)
          if (!authUserError) {
            ownerEmail = authUser.user.email?.trim().toLowerCase() ?? ""
          }
        } catch (error) {
          console.error("Could not resolve owner email from auth", error)
        }
      }
      const profilesRaw = ownerRecord?.profiles
      const profileRecord = Array.isArray(profilesRaw)
        ? asRecord(profilesRaw[0] ?? null)
        : asRecord(profilesRaw)
      const ownerName = readString(profileRecord, "full_name")

      if (ownerEmail.length > 0 && lead) {
        const leadRecord = asRecord(lead)
        const fieldsRaw = leadRecord?.crm_fields_all
        const fields: Array<{ label: string; value: string }> = []
        if (fieldsRaw && typeof fieldsRaw === "object" && !Array.isArray(fieldsRaw)) {
          for (const entry of Object.values(fieldsRaw)) {
            const field = asRecord(entry)
            const label = readString(field, "label")
            const value = readString(field, "value")
            if (label && value != null && value.trim().length > 0) {
              fields.push({ label, value: value.trim() })
            }
          }
        }

        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
        const leadUrl = `${baseUrl}/dashboard/crm`

        const { error: emailError } = await sendLeadOwnerAssignedEmail({
          to: ownerEmail,
          ownerName,
          assignerName: readString(asRecord(assignerProfile), "full_name"),
          orgName: readString(asRecord(org), "name"),
          leadName: readString(leadRecord, "full_name") ?? "Lead",
          leadEmail: readString(leadRecord, "email") ?? "",
          leadPhone: readString(leadRecord, "phone"),
          leadStatus: readString(leadRecord, "status") ?? "—",
          formTitle: readString(leadRecord, "form_title"),
          offerTitle: readString(leadRecord, "offer_title"),
          fields,
          leadUrl,
        })

        if (emailError) {
          console.error("Lead owner assignment email failed", emailError)
        }
      }
    }

    return ok({ owner_id: ownerId })
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Could not assign owner")
  }
}
