import { NextRequest, NextResponse } from "next/server"
import { getResendClient } from "@/lib/resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { ingestResendEmailWebhook } from "@/lib/services/campaign-delivery"

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!RESEND_WEBHOOK_SECRET) {
    console.error("RESEND_WEBHOOK_SECRET is not configured")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  const resend = getResendClient()
  if (!resend) {
    console.error("RESEND_API_KEY is not configured")
    return NextResponse.json(
      { error: "Email provider not configured" },
      { status: 500 }
    )
  }

  const payload = await req.text()
  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 })
  }

  let event
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret: RESEND_WEBHOOK_SECRET,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Resend webhook signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    const result = await ingestResendEmailWebhook(supabase, event, svixId)
    if (!result.ok) {
      console.error("Resend webhook ingest failed:", result.error)
      return NextResponse.json(
        { error: "Webhook handler failed" },
        { status: 500 }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Unhandled Resend webhook error for "${event.type}":`, message)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
