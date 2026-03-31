import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { badRequest, unauthorized, forbidden, jsonResponse } from "@/lib/api-helpers/api-response"
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
  const organizationIdRaw = formData.get("organization_id")
  const assetTypeRaw = String(formData.get("asset_type") ?? "logo").trim().toLowerCase()
  const assetType = assetTypeRaw === "hero" ? "hero" : "logo"

  if (!file || !file.size) {
    return badRequest("file is required")
  }

  const organizationId = Number(organizationIdRaw)
  if (!organizationId || !Number.isFinite(organizationId)) {
    return badRequest("Invalid organization id")
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!membership) {
    return forbidden("Forbidden")
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
    ? ext
    : "jpg"
  const storagePath =
    assetType === "hero"
      ? `${organizationId}/organizations/hero.${safeExt}`
      : `${organizationId}/organizations/logo.${safeExt}`

  const result = await uploadToBunnyStorage({ file, storagePath })
  if (!result.ok) return result.response

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("branding")
    .eq("id", organizationId)
    .single()

  const currentBranding = (orgRow?.branding ?? {}) as Record<string, unknown>
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      branding: {
        ...currentBranding,
        ...(assetType === "hero" ? { hero_image_url: result.url } : { logo_url: result.url }),
      },
    })
    .eq("id", organizationId)

  if (updateError) {
    return badRequest("Failed to save logo URL")
  }

  return jsonResponse(200, { url: result.url })
}

