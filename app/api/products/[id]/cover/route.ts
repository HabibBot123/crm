import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  badRequest,
  unauthorized,
  serverError,
  badGateway,
  jsonResponse,
} from "@/lib/api-helpers/api-response"
import { validateProductAccess } from "../_lib/validate"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME
  const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY
  const BUNNY_CDN_BASE = process.env.NEXT_PUBLIC_BUNNY_CDN_URL

  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY || !BUNNY_CDN_BASE) {
    return serverError("Bunny Storage is not configured")
  }

  const { id } = await context.params
  const productId = Number(id)
  const access = await validateProductAccess(supabase, user.id, productId)
  if (!access.ok) return access.response
  const { product } = access.data

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file || !file.size) {
    return badRequest("file is required")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
    ? ext
    : "jpg"
  const storagePath = `${product.organization_id}/products/${productId}/cover.${safeExt}`

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const bunnyRes = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${storagePath}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_STORAGE_API_KEY,
          "Content-Type": file.type || "image/jpeg",
        },
        body: buffer,
      }
    )

    if (!bunnyRes.ok) {
      const text = await bunnyRes.text().catch(() => "")
      console.error("Bunny storage upload failed:", text)
      return badGateway(
        "Failed to upload to Bunny Storage",
        text || undefined
      )
    }

    const cdnTrimmed = BUNNY_CDN_BASE.replace(/\/$/, "")
    const url = `${cdnTrimmed}/${storagePath}`

    const { error: updateError } = await supabase
      .from("products")
      .update({ cover_image_url: url })
      .eq("id", productId)

    if (updateError) {
      return serverError("Failed to save cover URL", updateError.message)
    }

    return jsonResponse(200, { url })
  } catch (error) {
    console.error("Cover upload error:", error)
    return serverError(
      "Unexpected error during upload",
      error instanceof Error ? error.message : String(error)
    )
  }
}
