import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  confirmCampaignUnsubscribe,
  fetchUnsubscribePreview,
} from "@/lib/services/campaign-unsubscribe"

const confirmSchema = z.object({
  token: z.string().min(1),
  campaignId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("t")?.trim() ?? ""
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const preview = await fetchUnsubscribePreview(supabase, token)
    if (!preview) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link" },
        { status: 400 }
      )
    }
    return NextResponse.json(preview)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load unsubscribe"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const result = await confirmCampaignUnsubscribe(
      supabase,
      parsed.data.token,
      parsed.data.campaignId
    )
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      alreadyOptedOut: result.alreadyOptedOut,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unsubscribe"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
