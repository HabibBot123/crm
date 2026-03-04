import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { id?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const id = Number(body.id)
  if (!id || !Number.isFinite(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY
  const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY

  const { data: item, error: fetchError } = await supabase
    .from("content_items")
    .select("id, type, bunny_video_id, bunny_storage_path")
    .eq("id", id)
    .single()

  if (fetchError || !item) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Content item not found" },
      { status: 404 }
    )
  }

  // Delete from Bunny Stream for videos
  if (item.type === "video" && item.bunny_video_id && BUNNY_STREAM_API_KEY && BUNNY_STREAM_LIBRARY_ID) {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${item.bunny_video_id}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          AccessKey: BUNNY_STREAM_API_KEY,
        },
      }
    )

    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => "")
      console.error("Failed to delete Bunny video:", text)
      return NextResponse.json(
        { error: "Failed to delete video from Bunny Stream" },
        { status: 502 }
      )
    }
  }

  // Delete from Bunny Storage for documents
  if (item.type !== "video" && item.bunny_storage_path && BUNNY_STORAGE_ZONE && BUNNY_STORAGE_API_KEY) {
    const res = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${item.bunny_storage_path}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
        },
      }
    )

    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => "")
      console.error("Failed to delete Bunny storage file:", text)
      return NextResponse.json(
        { error: "Failed to delete file from Bunny Storage" },
        { status: 502 }
      )
    }
  }

  const { error: deleteError } = await supabase
    .from("content_items")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

