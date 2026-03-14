import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { badRequest, unauthorized, jsonResponse } from "@/lib/api-helpers/api-response"
import { validateProductAccess } from "../_lib/validate"
import { uploadToBunnyStorage } from "@/lib/bunny"

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
  const file = formData.get("file") as File | null
  const productIdRaw = formData.get("product_id")

  if (!file || !file.size) {
    return badRequest("file is required")
  }

  const productId = Number(productIdRaw)
  const access = await validateProductAccess(supabase, user.id, productId)
  if (!access.ok) return access.response
  const { product } = access.data

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
    ? ext
    : "jpg"
  const storagePath = `${product.organization_id}/products/${productId}/cover.${safeExt}`

  const result = await uploadToBunnyStorage({ file, storagePath })
  if (!result.ok) return result.response

  const { error: updateError } = await supabase
    .from("products")
    .update({ cover_image_url: result.url })
    .eq("id", productId)

  if (updateError) {
    return badRequest("Failed to save cover URL")
  }

  return jsonResponse(200, { url: result.url })
}

