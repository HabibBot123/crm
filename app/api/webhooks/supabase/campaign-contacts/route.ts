import { after, NextResponse } from "next/server"
import { z } from "zod"
import {
  CAMPAIGN_CONTACT_SYNC_EVENT,
  inngest,
} from "@/lib/inngest/client"

const webhookRecordSchema = z.object({
  organization_id: z.coerce.number().int().positive(),
  email: z.string().min(1),
  marketing_opt_in: z.boolean().optional(),
  resend_contact_id: z.string().nullable().optional(),
  provider_properties_synced_at: z.string().nullable().optional(),
  provider_sync_error: z.string().nullable().optional(),
  lead_id: z.number().nullable().optional(),
  enrollment_id: z.number().nullable().optional(),
  updated_at: z.string().optional(),
})

const webhookPayloadSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  schema: z.string().optional(),
  record: webhookRecordSchema.nullable().optional(),
  old_record: webhookRecordSchema.nullable().optional(),
})

function isAuthorized(request: Request): boolean {
  const secret = process.env.SUPABASE_CAMPAIGN_CONTACTS_WEBHOOK_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get("authorization")?.trim() ?? ""
  if (header === `Bearer ${secret}`) return true
  const custom = request.headers.get("x-webhook-secret")?.trim() ?? ""
  return custom === secret
}

/** Skip DELETE and provider-sync echoes (only provider_* / resend_contact_id changed). */
function shouldEnqueueSync(
  type: "INSERT" | "UPDATE" | "DELETE",
  record: z.infer<typeof webhookRecordSchema> | null | undefined,
  oldRecord: z.infer<typeof webhookRecordSchema> | null | undefined
): boolean {
  if (type === "DELETE" || !record) return false
  if (type === "INSERT") return true
  if (!oldRecord) return true

  const audienceUnchanged =
    record.email === oldRecord.email &&
    record.marketing_opt_in === oldRecord.marketing_opt_in &&
    record.lead_id === oldRecord.lead_id &&
    record.enrollment_id === oldRecord.enrollment_id &&
    record.updated_at === oldRecord.updated_at

  // CRM/trigger paths bump `updated_at`. Provider sync does not.
  if (audienceUnchanged) return false
  return true
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = webhookPayloadSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { type, table, record, old_record: oldRecord } = parsed.data
  if (table !== "campaign_contacts") {
    return NextResponse.json({ ok: true, skipped: "wrong_table" })
  }

  if (!shouldEnqueueSync(type, record, oldRecord) || !record) {
    return NextResponse.json({ ok: true, skipped: "no_sync" })
  }

  const organizationId = record.organization_id
  const email = record.email.trim().toLowerCase()

  // Reply fast to Supabase/pg_net; enqueue Inngest after the response.
  after(() => {
    void inngest
      .send({
        name: CAMPAIGN_CONTACT_SYNC_EVENT,
        data: { organizationId, email },
      })
      .catch((error: unknown) => {
        console.error("campaign-contacts webhook inngest.send failed:", error)
      })
  })

  return NextResponse.json({ ok: true, enqueued: true })
}
