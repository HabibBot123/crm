import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY
  const BUNNY_CDN_BASE = process.env.NEXT_PUBLIC_BUNNY_CDN_URL

  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY || !BUNNY_CDN_BASE) {
    return NextResponse.json(
      { error: "Bunny Storage is not configured" },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const itemIdRaw = formData.get("itemId")
  const file = formData.get("file") as File | null

  const itemId = typeof itemIdRaw === "string" ? Number(itemIdRaw) : NaN

  if (!itemId || !Number.isFinite(itemId) || !file) {
    return NextResponse.json(
      { error: "itemId and file are required" },
      { status: 400 }
    )
  }

  const { data: item, error: fetchError } = await supabase
    .from("content_items")
    .select("id, organization_id, bunny_storage_path, upload_status")
    .eq("id", itemId)
    .single()

  if (fetchError || !item) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Content item not found" },
      { status: 404 }
    )
  }

  // Always use organization_id/fileName as storage path in Bunny Storage
  const storagePath = `${item.organization_id}/${file.name}`

  // Mark as uploading
  await supabase
    .from("content_items")
    .update({ upload_status: "uploading" })
    .eq("id", itemId)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const bunnyRes = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${storagePath}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: buffer,
      }
    )

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text().catch(() => "")
      console.error("Bunny storage upload failed:", text)
      await supabase
        .from("content_items")
        .update({ upload_status: "failed" })
        .eq("id", itemId)

      return NextResponse.json(
        { error: "Failed to upload to Bunny Storage" },
        { status: 502 }
      )
    }

    // Mark as ready and ensure bunny_storage_path stores the CDN URL
    const cdnTrimmed = BUNNY_CDN_BASE.replace(/\/$/, "")
    const publicUrl = `${cdnTrimmed}/${storagePath}`

    await supabase
      .from("content_items")
      .update({ upload_status: "ready", bunny_storage_path: publicUrl })
      .eq("id", itemId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Storage upload error:", error)
    await supabase
      .from("content_items")
      .update({ upload_status: "failed" })
      .eq("id", itemId)

    return NextResponse.json(
      { error: "Unexpected error during Bunny upload" },
      { status: 500 }
    )
  }
}

