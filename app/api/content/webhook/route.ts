import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

type BunnyWebhookPayload = {
  VideoLibraryId: number
  VideoGuid: string
  Status: number
}

function mapBunnyStatusToUploadStatus(status: number): string | null {
  switch (status) {
    case 6: // PresignedUploadStarted
      return "uploading"
    case 7: // PresignedUploadFinished
      return "uploaded"
    case 8: // PresignedUploadFailed
      return "failed"
    case 0: // Queued
    case 1: // Processing
    case 2: // Encoding
    case 4: // Resolution finished (processing but playable)
      return "processing"
    case 3: // Finished
      return "ready"
    case 5: // Failed
      return "failed"
    default:
      return null
  }
}

export async function POST(request: Request) {
  const admin = createAdminClient()

  let body: BunnyWebhookPayload
  try {
    body = (await request.json()) as BunnyWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const libraryIdEnv = process.env.BUNNY_STREAM_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY

  if (!libraryIdEnv || !apiKey) {
    return NextResponse.json(
      { error: "Bunny Stream not configured" },
      { status: 500 }
    )
  }

  const libraryId = Number(libraryIdEnv)
  if (!Number.isFinite(libraryId)) {
    return NextResponse.json(
      { error: "Invalid BUNNY_STREAM_LIBRARY_ID" },
      { status: 500 }
    )
  }

  // Ignore webhooks for other libraries
  if (body.VideoLibraryId !== libraryId) {
    return NextResponse.json({ ok: true })
  }

  const uploadStatus = mapBunnyStatusToUploadStatus(body.Status)

  try {
    const updates: Record<string, unknown> = {}
    if (uploadStatus) {
      updates.upload_status = uploadStatus
    }

    // On Finished, fetch video details to get duration and file size
    if (body.Status === 3) {
      const res = await fetch(
        `https://video.bunnycdn.com/library/${libraryIdEnv}/videos/${body.VideoGuid}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            AccessKey: apiKey,
          },
        }
      )

      if (res.ok) {
        const video = (await res.json()) as { length?: number; storageSize?: number }
        if (typeof video.length === "number" && Number.isFinite(video.length)) {
          updates.duration = Math.round(video.length)
        }
        if (typeof video.storageSize === "number" && Number.isFinite(video.storageSize)) {
          updates.file_size = Math.round(video.storageSize)
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await admin
        .from("content_items")
        .update(updates)
        .eq("bunny_video_id", body.VideoGuid)
    }
  } catch (error) {
    console.error("Error handling Bunny webhook:", error)
    // Always return 200 to avoid Bunny retry storms; log for investigation
  }

  return NextResponse.json({ ok: true })
}

