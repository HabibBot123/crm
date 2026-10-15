import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  badRequest,
  unauthorized,
  jsonResponse,
} from "@/lib/api-helpers/api-response"
import { uploadToBunnyStorage } from "@/lib/bunny"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File) || !file.size) {
    return badRequest("file is required")
  }

  if (file.size > MAX_BYTES) {
    return badRequest("Image must be 5 MB or less")
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return badRequest("Use JPG, PNG, WebP, or GIF")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
    ? ext === "jpeg"
      ? "jpg"
      : ext
    : "jpg"
  const storagePath = `avatars/${user.id}/avatar.${safeExt}`

  const result = await uploadToBunnyStorage({ file, storagePath })
  if (!result.ok) return result.response

  // Cache-bust CDN after overwrite
  const url = `${result.url}?v=${Date.now()}`

  const { error: updateError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      avatar_url: url,
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (updateError) {
    return badRequest("Failed to save avatar URL")
  }

  return jsonResponse(200, { url })
}
