import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  badRequest,
  conflict,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-helpers/api-response"

const SLUG_TAKEN = "This slug is already taken"

export async function POST(request: Request) {
  const serverClient = await createClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()

  if (authError || !user) {
    return unauthorized("Unauthorized")
  }

  let body: { slug?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const slugValue = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : ""
  const nameValue = typeof body.name === "string" ? body.name.trim() : ""

  if (!slugValue || !nameValue) {
    return badRequest("Organization name and slug are required")
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)) {
    return badRequest("Slug must be lowercase letters, numbers, and hyphens only")
  }

  const reservedSlugs = ["coached", "app"]
  if (reservedSlugs.includes(slugValue)) {
    return conflict(SLUG_TAKEN)
  }

  const adminClient = createAdminClient()

  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      slug: slugValue,
      name: nameValue,
      owner_id: user.id,
    })
    .select("id")
    .single()

  if (orgError) {
    if (orgError.code === "23505") {
      return conflict(SLUG_TAKEN)
    }
    return serverError(orgError.message)
  }

  const { error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    })

  if (memberError) {
    return serverError(memberError.message)
  }

  return ok({ organization_id: org.id })
}
