import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "node:crypto"

type IncomingFile = {
  name: string
  originalName: string
  mimeType: string
  size: number
  type: "video" | "pdf" | "word" | "excel" | "powerpoint"
  durationSeconds?: number | null
}

type UploadRequestBody = {
  organizationId: number
  folderId: number | null
  files: IncomingFile[]
}

type BunnyCreateVideoResponse = {
  guid: string
  title: string
  libraryId: number
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: UploadRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const organizationId = Number(body.organizationId)
  if (!organizationId || !Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
  }

  if (!Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "files array is required" }, { status: 400 })
  }

  const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY
  const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID
  const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_CDN_BASE = process.env.NEXT_PUBLIC_BUNNY_CDN_URL

  if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID || !BUNNY_STORAGE_ZONE || !BUNNY_CDN_BASE) {
    return NextResponse.json(
      { error: "Bunny configuration is missing on the server" },
      { status: 500 }
    )
  }

  const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB
  const MAX_DOC_BYTES = 50 * 1024 * 1024 // 50 MB

  for (const file of body.files) {
    if (file.type === "video" && file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `Video "${file.name}" is larger than 5GB limit.` },
        { status: 400 }
      )
    }
    if (file.type !== "video" && file.size > MAX_DOC_BYTES) {
      return NextResponse.json(
        { error: `File "${file.name}" is larger than 50MB limit.` },
        { status: 400 }
      )
    }
  }

  // 1) Create content_items rows with minimal metadata
  const inserts = body.files.map((file) => ({
    organization_id: organizationId,
    folder_id: body.folderId,
    type: file.type,
    name: file.name,
    file_size: file.size,
    duration:
      file.type === "video" && typeof file.durationSeconds === "number"
        ? Math.round(file.durationSeconds)
        : null,
    upload_status: "pending" as const,
  }))

  const { data: items, error: insertError } = await supabase
    .from("content_items")
    .insert(inserts)
    .select("*")

  if (insertError || !items) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create content items" },
      { status: 500 }
    )
  }

  // 2) For each file, prepare Bunny information (TUS for videos, storage path for documents)
  const results: any[] = []

  const createVideoPromises = body.files.map(async (file, index) => {
    const dbItem = items[index]
    if (!dbItem) return

    if (file.type === "video") {
      // Create Bunny Stream video object
      const createRes = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            AccessKey: BUNNY_STREAM_API_KEY,
          },
          body: JSON.stringify({
            title: file.name || file.originalName || "Untitled video",
          }),
        }
      )

      if (!createRes.ok) {
        const errorText = await createRes.text().catch(() => "")
        console.error("Failed to create Bunny video:", errorText)
        results.push({
          id: dbItem.id,
          type: file.type,
          name: dbItem.name,
          error: "Failed to create Bunny video object",
        })
        return
      }

      const video = (await createRes.json()) as BunnyCreateVideoResponse
      // Update DB with video id
      await supabase
        .from("content_items")
        .update({ bunny_video_id: video.guid })
        .eq("id", dbItem.id)

      const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24h
      const signature = createHash("sha256")
        .update(`${BUNNY_STREAM_LIBRARY_ID}${BUNNY_STREAM_API_KEY}${expirationTime}${video.guid}`)
        .digest("hex")

      results.push({
        id: dbItem.id,
        type: file.type,
        name: dbItem.name,
        fileSize: file.size,
        bunnyVideoId: video.guid,
        tus: {
          videoId: video.guid,
          libraryId: BUNNY_STREAM_LIBRARY_ID,
          expirationTime,
          signature,
          endpoint: "https://video.bunnycdn.com/tusupload",
        },
      })
    } else {
      // Non-video: Bunny Storage file, store final CDN URL in bunny_storage_path
      const safeName = file.originalName || file.name
      const storagePath = `${organizationId}/${safeName}`
      const cdnTrimmed = BUNNY_CDN_BASE.replace(/\/$/, "")
      const publicUrl = `${cdnTrimmed}/${storagePath}`

      await supabase
        .from("content_items")
        .update({ bunny_storage_path: publicUrl })
        .eq("id", dbItem.id)

      results.push({
        id: dbItem.id,
        type: file.type,
        name: dbItem.name,
        fileSize: file.size,
        storage: {
          storageZone: BUNNY_STORAGE_ZONE,
          path: storagePath,
          url: publicUrl,
        },
      })
    }
  })

  await Promise.all(createVideoPromises)

  return NextResponse.json({ items: results })
}

