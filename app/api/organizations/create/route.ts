import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type OrganizationsClaim = {
  organization_id: number
  roles: string[]
  organization_member_ids: number[]
}

export async function POST(request: Request) {
  const serverClient = await createClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { slug?: string; name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const slugValue = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : ""
  const nameValue = typeof body.name === "string" ? body.name.trim() : ""

  if (!slugValue || !nameValue) {
    return NextResponse.json({ error: "Organization name and slug are required" }, { status: 400 })
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue)) {
    return NextResponse.json({
      error: "Slug must be lowercase letters, numbers, and hyphens only",
    }, { status: 400 })
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
      return NextResponse.json({ error: "This slug is already taken" }, { status: 409 })
    }
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  const { data: member, error: memberError } = await adminClient
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "admin",
      status: "active",
    })
    .select("id")
    .single()

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  const { data: { user: adminUser } } = await adminClient.auth.admin.getUserById(user.id)
  const existingOrgs = (adminUser?.app_metadata?.organizations ?? []) as OrganizationsClaim[]

  const updatedOrgs: OrganizationsClaim[] = [
    ...existingOrgs,
    {
      organization_id: org.id,
      roles: ["admin"],
      organization_member_ids: [member.id],
    },
  ]

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...adminUser?.app_metadata,
      organizations: updatedOrgs,
    },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ organization_id: org.id })
}
