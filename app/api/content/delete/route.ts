import { createClient } from "@/lib/supabase/server"
import {
  badRequest,
  conflict,
  notFound,
  ok,
  serverError,
  unauthorized,
  badGateway,
} from "@/lib/api-helpers/api-response"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized", authError?.message)
  }

  let body: { id?: number }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const id = Number(body.id)
  if (!id || !Number.isFinite(id)) {
    return badRequest("id is required")
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
    return notFound("Content item not found", fetchError?.message)
  }

  // Check if the content item is used in any product module
  const { count: usageCount, error: usageError } = await supabase
    .from("product_module_items")
    .select("id", { count: "exact", head: true })
    .eq("content_item_id", id)

  if (usageError) {
    return serverError("Failed to check content usage", usageError.message)
  }

  if (usageCount && usageCount > 0) {
    return conflict(
      "This content item is used in at least one product. Remove it from all products before deleting it."
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
      return badGateway("Failed to delete video from Bunny Stream", text)
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
      return badGateway("Failed to delete file from Bunny Storage", text)
    }
  }

  const { error: deleteError } = await supabase
    .from("content_items")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return serverError("Failed to delete content item", deleteError.message)
  }

  return ok({ ok: true })
}

