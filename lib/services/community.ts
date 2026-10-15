import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { parseOrganizationBrandingJson } from "@/schemas/organization-branding.schema"
import { readOptionalString } from "@/lib/user-display"
import { findClientByEmail } from "@/lib/services/clients"
import {
  addableCommunitySpaceMemberMatchSchema,
  addCommunitySpaceMemberInputSchema,
  communityFeedPostsCursorSchema,
  communityFeedSchema,
  communityPostCommentSchema,
  communityPostSchema,
  communitySpaceMemberSchema,
  communitySpaceMembershipRuleSchema,
  communitySpaceSchema,
  coachedCommunityOrgSchema,
  createCommunityFeedInputSchema,
  createCommunityPostCommentInputSchema,
  createCommunityPostInputSchema,
  createCommunitySpaceInputSchema,
  orgAccessDirectoryRowSchema,
  orgAccessOriginSchema,
  removeCommunitySpaceMemberInputSchema,
  replaceCommunitySpaceMembershipRulesInputSchema,
  toggleCommunityPostLikeInputSchema,
  updateCommunityFeedInputSchema,
  updateCommunitySpaceInputSchema,
  type AddableCommunitySpaceMemberMatch,
  type AddCommunitySpaceMemberInput,
  type CommunityFeed,
  type CommunityFeedPostsCursor,
  type CommunityPost,
  type CommunityPostComment,
  type CommunitySpace,
  type CommunitySpaceMember,
  type CommunitySpaceMembershipRule,
  type CoachedCommunityOrg,
  type CreateCommunityFeedInput,
  type CreateCommunityPostCommentInput,
  type CreateCommunityPostInput,
  type CreateCommunitySpaceInput,
  type OrgAccessDirectoryRow,
  type OrgAccessOrigin,
  type RemoveCommunitySpaceMemberInput,
  type ReplaceCommunitySpaceMembershipRulesInput,
  type ToggleCommunityPostLikeInput,
  type UpdateCommunityFeedInput,
  type UpdateCommunitySpaceInput,
} from "@/schemas/community.schema"

function brandingFields(raw: unknown): {
  logo_url: string | null
  primary_color: string | null
} {
  const branding = parseOrganizationBrandingJson(raw)
  return {
    logo_url: branding.logo_url ?? null,
    primary_color: branding.primary_color ?? null,
  }
}

const spaceWithOrgSchema = communitySpaceSchema.extend({
  organization_name: z.string().optional(),
  organization_slug: z.string().optional(),
  organization_logo_url: z.string().nullable().optional(),
  organization_primary_color: z.string().nullable().optional(),
})

export type CommunitySpaceWithOrg = z.infer<typeof spaceWithOrgSchema>

export async function fetchOrgCommunitySpaces(
  supabase: SupabaseClient,
  organizationId: number,
  options?: { includeArchived?: boolean }
): Promise<CommunitySpace[]> {
  let query = supabase
    .from("community_spaces")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })

  if (!options?.includeArchived) {
    query = query.is("archived_at", null)
  }

  const { data, error } = await query
  if (error) throw error
  return z.array(communitySpaceSchema).parse(
    (data ?? []).map((row) => ({ ...row, settings: row.settings ?? {} }))
  )
}

export async function createCommunitySpace(
  supabase: SupabaseClient,
  input: CreateCommunitySpaceInput
): Promise<CommunitySpace> {
  const parsed = createCommunitySpaceInputSchema.parse(input)
  const { data, error } = await supabase.rpc("create_community_space", {
    p_organization_id: parsed.organization_id,
    p_name: parsed.name,
    p_description: parsed.description ?? null,
    p_sync_clients: parsed.sync_clients,
    p_offer_rules: parsed.offer_rules.map((rule) => ({
      offer_id: rule.offer_id,
      remove_on_expire: rule.remove_on_expire,
    })),
  })
  if (error) throw error
  return communitySpaceSchema.parse({
    ...data,
    settings: data.settings ?? {},
  })
}

export async function fetchCommunitySpaceMembershipRules(
  supabase: SupabaseClient,
  spaceId: number
): Promise<CommunitySpaceMembershipRule[]> {
  const { data, error } = await supabase
    .from("community_space_membership_rules")
    .select(
      "id, space_id, organization_id, offer_id, remove_on_expire, created_at, offers(title)"
    )
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return z.array(communitySpaceMembershipRuleSchema).parse(
    (data ?? []).map((row) => {
      const offersRaw = row.offers
      const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw
      const offerName =
        offer && typeof offer === "object" && "title" in offer
          ? typeof offer.title === "string"
            ? offer.title
            : null
          : null
      return {
        id: row.id,
        space_id: row.space_id,
        organization_id: row.organization_id,
        offer_id: row.offer_id,
        remove_on_expire: row.remove_on_expire,
        created_at: row.created_at,
        offer_name: offerName,
      }
    })
  )
}

export async function replaceCommunitySpaceMembershipRules(
  supabase: SupabaseClient,
  input: ReplaceCommunitySpaceMembershipRulesInput
): Promise<void> {
  const parsed = replaceCommunitySpaceMembershipRulesInputSchema.parse(input)

  const { error: deleteError } = await supabase
    .from("community_space_membership_rules")
    .delete()
    .eq("space_id", parsed.space_id)
  if (deleteError) throw deleteError

  if (parsed.offer_rules.length > 0) {
    const { error: insertError } = await supabase
      .from("community_space_membership_rules")
      .insert(
        parsed.offer_rules.map((rule) => ({
          space_id: parsed.space_id,
          organization_id: parsed.organization_id,
          offer_id: rule.offer_id,
          remove_on_expire: rule.remove_on_expire,
        }))
      )
    if (insertError) throw insertError
  }

  if (parsed.resync) {
    await syncCommunitySpaceMembersFromEnrollments(supabase, parsed.space_id)
  }
}

async function isActiveCommunitySpaceMember(
  supabase: SupabaseClient,
  spaceId: number,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("community_space_members")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .is("left_at", null)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data != null
}

export async function findAddableCommunitySpaceMemberByEmail(
  supabase: SupabaseClient,
  input: { organizationId: number; spaceId: number; email: string }
): Promise<AddableCommunitySpaceMemberMatch> {
  const normalized = input.email.trim().toLowerCase()
  if (!normalized.includes("@") || !normalized.includes(".")) {
    throw new Error("Enter a valid email")
  }

  const { data: teamRow, error: teamError } = await supabase
    .from("organization_members")
    .select("user_id, email, profiles(full_name)")
    .eq("organization_id", input.organizationId)
    .eq("status", "active")
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle()
  if (teamError) throw teamError

  if (teamRow?.user_id) {
    const profilesRaw = teamRow.profiles
    const profile = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw
    const displayName =
      profile && typeof profile === "object" && "full_name" in profile
        ? readOptionalString(profile.full_name)
        : null
    const already = await isActiveCommunitySpaceMember(
      supabase,
      input.spaceId,
      teamRow.user_id
    )
    return addableCommunitySpaceMemberMatchSchema.parse({
      status: already ? "already_member" : "found",
      user_id: teamRow.user_id,
      email: normalized,
      display_name: displayName,
      kind: "team",
    })
  }

  const client = await findClientByEmail(
    supabase,
    input.organizationId,
    normalized
  )
  if (client?.user_id) {
    const already = await isActiveCommunitySpaceMember(
      supabase,
      input.spaceId,
      client.user_id
    )
    return addableCommunitySpaceMemberMatchSchema.parse({
      status: already ? "already_member" : "found",
      user_id: client.user_id,
      email: normalized,
      display_name: client.client_display || null,
      kind: "client",
    })
  }
  if (client) {
    return addableCommunitySpaceMemberMatchSchema.parse({
      status: "no_account",
      email: normalized,
      display_name: client.client_display || null,
      kind: "client",
    })
  }

  return addableCommunitySpaceMemberMatchSchema.parse({
    status: "not_found",
    email: normalized,
  })
}

export async function addCommunitySpaceMember(
  supabase: SupabaseClient,
  input: AddCommunitySpaceMemberInput
): Promise<CommunitySpaceMember> {
  const parsed = addCommunitySpaceMemberInputSchema.parse(input)
  const { data, error } = await supabase.rpc("add_community_space_member", {
    p_space_id: parsed.space_id,
    p_user_id: parsed.user_id,
  })
  if (error) throw error
  return communitySpaceMemberSchema.parse({
    ...data,
    full_name: null,
    avatar_url: null,
  })
}

export async function removeCommunitySpaceMember(
  supabase: SupabaseClient,
  input: RemoveCommunitySpaceMemberInput
): Promise<void> {
  const parsed = removeCommunitySpaceMemberInputSchema.parse(input)
  const { error } = await supabase.rpc("remove_community_space_member", {
    p_space_id: parsed.space_id,
    p_user_id: parsed.user_id,
  })
  if (error) throw error
}

export async function updateCommunitySpace(
  supabase: SupabaseClient,
  input: UpdateCommunitySpaceInput
): Promise<CommunitySpace> {
  const parsed = updateCommunitySpaceInputSchema.parse(input)
  const { data, error } = await supabase
    .from("community_spaces")
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.space_id)
    .select("*")
    .single()
  if (error) throw error
  return communitySpaceSchema.parse({
    ...data,
    settings: data.settings ?? {},
  })
}

export async function archiveCommunitySpace(
  supabase: SupabaseClient,
  spaceId: number
): Promise<void> {
  const { error } = await supabase
    .from("community_spaces")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", spaceId)
  if (error) throw error
}

export async function syncCommunitySpaceMembersFromEnrollments(
  supabase: SupabaseClient,
  spaceId: number
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "sync_community_space_members_from_enrollments",
    { p_space_id: spaceId }
  )
  if (error) throw error
  return z.number().int().parse(data ?? 0)
}

export async function fetchCommunitySpaceFeeds(
  supabase: SupabaseClient,
  spaceId: number
): Promise<CommunityFeed[]> {
  const { data, error } = await supabase
    .from("community_feeds")
    .select("*")
    .eq("space_id", spaceId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
  if (error) throw error
  return z.array(communityFeedSchema).parse(data ?? [])
}

/** Mirrors DB `community_slugify`. */
function communitySlugify(input: string): string {
  let v = input.trim().toLowerCase()
  v = v.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  if (!v) v = "feed"
  return v.slice(0, 60)
}

async function uniqueFeedSlug(
  supabase: SupabaseClient,
  spaceId: number,
  name: string
): Promise<string> {
  const base = communitySlugify(name)
  const { data, error } = await supabase
    .from("community_feeds")
    .select("slug")
    .eq("space_id", spaceId)
  if (error) throw error
  const taken = new Set((data ?? []).map((row) => row.slug))
  if (!taken.has(base)) return base
  let i = 1
  while (taken.has(`${base.slice(0, 50)}-${i}`)) i += 1
  return `${base.slice(0, 50)}-${i}`
}

export async function createCommunityFeed(
  supabase: SupabaseClient,
  input: CreateCommunityFeedInput
): Promise<CommunityFeed> {
  const parsed = createCommunityFeedInputSchema.parse(input)
  const slug = await uniqueFeedSlug(supabase, parsed.space_id, parsed.name)

  const { data: existing, error: existingError } = await supabase
    .from("community_feeds")
    .select("sort_order")
    .eq("space_id", parsed.space_id)
    .is("archived_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
  if (existingError) throw existingError
  const nextOrder =
    existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { data, error } = await supabase
    .from("community_feeds")
    .insert({
      space_id: parsed.space_id,
      organization_id: parsed.organization_id,
      name: parsed.name,
      slug,
      sort_order: nextOrder,
      who_can_post: parsed.who_can_post,
    })
    .select("*")
    .single()
  if (error) throw error
  return communityFeedSchema.parse(data)
}

export async function updateCommunityFeed(
  supabase: SupabaseClient,
  input: UpdateCommunityFeedInput
): Promise<CommunityFeed> {
  const parsed = updateCommunityFeedInputSchema.parse(input)
  const { data, error } = await supabase
    .from("community_feeds")
    .update({
      name: parsed.name,
      who_can_post: parsed.who_can_post,
    })
    .eq("id", parsed.feed_id)
    .is("archived_at", null)
    .select("*")
    .single()
  if (error) throw error
  return communityFeedSchema.parse(data)
}

export async function archiveCommunityFeed(
  supabase: SupabaseClient,
  feedId: number
): Promise<void> {
  const { error } = await supabase
    .from("community_feeds")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", feedId)
  if (error) throw error
}

function mapSpaceMemberRow(row: {
  id: number
  space_id: number
  organization_id: number
  user_id: string
  role: string
  source: string
  joined_at: string
  left_at: string | null
  profiles:
    | { full_name?: unknown; avatar_url?: unknown }
    | { full_name?: unknown; avatar_url?: unknown }[]
    | null
}): CommunitySpaceMember {
  const profileRaw = row.profiles
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
  return communitySpaceMemberSchema.parse({
    id: row.id,
    space_id: row.space_id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    source: row.source,
    joined_at: row.joined_at,
    left_at: row.left_at,
    full_name:
      profile && typeof profile === "object" && "full_name" in profile
        ? readOptionalString(profile.full_name)
        : null,
    avatar_url:
      profile && typeof profile === "object" && "avatar_url" in profile
        ? readOptionalString(profile.avatar_url)
        : null,
  })
}

export type CommunitySpaceMembersPage = {
  items: CommunitySpaceMember[]
  total: number
  page: number
  pageSize: number
}

export async function fetchCommunitySpaceMembersPage(
  supabase: SupabaseClient,
  spaceId: number,
  options?: { q?: string; page?: number; pageSize?: number }
): Promise<CommunitySpaceMembersPage> {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, options?.pageSize ?? 24))
  const q = options?.q?.trim() ?? ""
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("community_space_members")
    .select(
      "id, space_id, organization_id, user_id, role, source, joined_at, left_at, profiles!inner(full_name, avatar_url)",
      { count: "exact" }
    )
    .eq("space_id", spaceId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })
    .range(from, to)

  if (q) {
    query = query.ilike("profiles.full_name", `%${q}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    items: (data ?? []).map((row) => mapSpaceMemberRow(row)),
    total: count ?? 0,
    page,
    pageSize,
  }
}

/** Spaces the current user can open in the coached portal (member or staff caps via RLS). */
export async function fetchMyCommunitySpaces(
  supabase: SupabaseClient,
  options?: { organizationId?: number }
): Promise<CommunitySpaceWithOrg[]> {
  let query = supabase
    .from("community_spaces")
    .select(
      "id, organization_id, name, slug, description, settings, archived_at, created_at, updated_at, organizations(name, slug, branding)"
    )
    .is("archived_at", null)
    .order("name", { ascending: true })

  if (options?.organizationId != null) {
    query = query.eq("organization_id", options.organizationId)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const orgRaw = row.organizations
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
    const brand =
      org && typeof org === "object" && "branding" in org
        ? brandingFields(org.branding)
        : { logo_url: null, primary_color: null }
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      settings: row.settings ?? {},
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      organization_name:
        org && typeof org === "object" && "name" in org
          ? String(org.name)
          : undefined,
      organization_slug:
        org && typeof org === "object" && "slug" in org
          ? String(org.slug)
          : undefined,
      organization_logo_url: brand.logo_url,
      organization_primary_color: brand.primary_color,
    }
  })

  return z.array(spaceWithOrgSchema).parse(rows)
}

export async function fetchCommunitySpaceByOrgAndSlug(
  supabase: SupabaseClient,
  orgSlug: string,
  spaceSlug: string
): Promise<CommunitySpaceWithOrg | null> {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .maybeSingle()
  if (orgError) throw orgError
  if (!org) return null

  const { data, error } = await supabase
    .from("community_spaces")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", spaceSlug)
    .is("archived_at", null)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return spaceWithOrgSchema.parse({
    ...data,
    settings: data.settings ?? {},
    organization_name: org.name,
    organization_slug: org.slug,
  })
}

/** Orgs the user can enter via space membership and/or active enrollments. */
export async function fetchCoachedCommunityOrgs(
  supabase: SupabaseClient,
  userId: string
): Promise<CoachedCommunityOrg[]> {
  const [enrollmentsResult, visibleSpacesResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("organization_id, organizations!inner(id, name, slug, branding)")
      .eq("user_id", userId)
      .in("status", ["active", "paused"]),
    fetchMyCommunitySpaces(supabase),
  ])

  if (enrollmentsResult.error) throw enrollmentsResult.error

  const byOrg = new Map<
    number,
    {
      organization_id: number
      organization_name: string
      organization_slug: string
      logo_url: string | null
      primary_color: string | null
      space_ids: Set<number>
    }
  >()

  for (const space of visibleSpacesResult) {
    if (space.organization_name == null || space.organization_slug == null) {
      continue
    }
    const existing = byOrg.get(space.organization_id) ?? {
      organization_id: space.organization_id,
      organization_name: space.organization_name,
      organization_slug: space.organization_slug,
      logo_url: space.organization_logo_url ?? null,
      primary_color: space.organization_primary_color ?? null,
      space_ids: new Set<number>(),
    }
    if (!existing.logo_url && space.organization_logo_url) {
      existing.logo_url = space.organization_logo_url
    }
    if (!existing.primary_color && space.organization_primary_color) {
      existing.primary_color = space.organization_primary_color
    }
    existing.space_ids.add(space.id)
    byOrg.set(space.organization_id, existing)
  }

  for (const row of enrollmentsResult.data ?? []) {
    const orgRaw = row.organizations
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
    if (!org || typeof org !== "object" || !("id" in org)) continue
    const orgId = Number(org.id)
    const brand =
      "branding" in org
        ? brandingFields(org.branding)
        : { logo_url: null, primary_color: null }
    const existing = byOrg.get(orgId)
    if (existing) {
      if (!existing.logo_url && brand.logo_url) {
        existing.logo_url = brand.logo_url
      }
      if (!existing.primary_color && brand.primary_color) {
        existing.primary_color = brand.primary_color
      }
      continue
    }
    byOrg.set(orgId, {
      organization_id: orgId,
      organization_name: String(org.name),
      organization_slug: String(org.slug),
      logo_url: brand.logo_url,
      primary_color: brand.primary_color,
      space_ids: new Set(),
    })
  }

  const list = Array.from(byOrg.values()).map((o) => ({
    organization_id: o.organization_id,
    organization_name: o.organization_name,
    organization_slug: o.organization_slug,
    space_count: o.space_ids.size,
    logo_url: o.logo_url,
    primary_color: o.primary_color,
  }))

  list.sort((a, b) => a.organization_name.localeCompare(b.organization_name))
  return z.array(coachedCommunityOrgSchema).parse(list)
}

export function spaceHref(spaceSlug: string): string {
  return `/s/${spaceSlug}`
}

export type CommunityFeedPostsPage = {
  items: CommunityPost[]
  nextCursor: CommunityFeedPostsCursor | null
}

const engagementRowSchema = z.object({
  post_id: z.coerce.number().int().positive(),
  like_count: z.coerce.number().int().nonnegative(),
  comment_count: z.coerce.number().int().nonnegative(),
  liked_by_me: z.boolean(),
})

async function enrichPostsWithEngagement(
  supabase: SupabaseClient,
  posts: CommunityPost[],
  userId: string | null
): Promise<CommunityPost[]> {
  if (posts.length === 0) return posts
  const ids = posts.map((p) => p.id)
  const { data, error } = await supabase.rpc("community_posts_engagement", {
    p_post_ids: ids,
    p_user_id: userId,
  })
  if (error) throw error
  const byId = new Map(
    z.array(engagementRowSchema).parse(data ?? []).map((row) => [row.post_id, row])
  )
  return posts.map((post) => {
    const eng = byId.get(post.id)
    return communityPostSchema.parse({
      ...post,
      like_count: eng?.like_count ?? 0,
      comment_count: eng?.comment_count ?? 0,
      liked_by_me: eng?.liked_by_me ?? false,
    })
  })
}

function mapPostRow(row: {
  id: number
  organization_id: number
  space_id: number
  feed_id: number
  author_user_id: string
  body: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  profiles:
    | { full_name?: unknown; avatar_url?: unknown }
    | { full_name?: unknown; avatar_url?: unknown }[]
    | null
}): CommunityPost {
  const profileRaw = row.profiles
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
  return communityPostSchema.parse({
    id: row.id,
    organization_id: row.organization_id,
    space_id: row.space_id,
    feed_id: row.feed_id,
    author_user_id: row.author_user_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    author_full_name:
      profile && typeof profile === "object" && "full_name" in profile
        ? readOptionalString(profile.full_name)
        : null,
    author_avatar_url:
      profile && typeof profile === "object" && "avatar_url" in profile
        ? readOptionalString(profile.avatar_url)
        : null,
  })
}

export async function fetchCommunityFeedPostsPage(
  supabase: SupabaseClient,
  feedId: number,
  options?: {
    cursor?: CommunityFeedPostsCursor | null
    limit?: number
    userId?: string | null
  }
): Promise<CommunityFeedPostsPage> {
  const limit = Math.min(40, Math.max(1, options?.limit ?? 20))
  const cursor = options?.cursor
    ? communityFeedPostsCursorSchema.parse(options.cursor)
    : null

  let query = supabase
    .from("community_posts")
    .select(
      "id, organization_id, space_id, feed_id, author_user_id, body, created_at, updated_at, deleted_at, profiles!community_posts_author_user_id_fkey(full_name, avatar_url)"
    )
    .eq("feed_id", feedId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const mapped = (data ?? []).map((row) => mapPostRow(row))
  const hasMore = mapped.length > limit
  const pageItems = hasMore ? mapped.slice(0, limit) : mapped
  const enriched = await enrichPostsWithEngagement(
    supabase,
    pageItems,
    options?.userId ?? null
  )
  const last = enriched[enriched.length - 1]
  return {
    items: enriched,
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at, id: last.id }
        : null,
  }
}

export async function createCommunityPost(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCommunityPostInput
): Promise<CommunityPost> {
  const parsed = createCommunityPostInputSchema.parse(input)
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      organization_id: parsed.organization_id,
      space_id: parsed.space_id,
      feed_id: parsed.feed_id,
      author_user_id: userId,
      body: parsed.body,
    })
    .select(
      "id, organization_id, space_id, feed_id, author_user_id, body, created_at, updated_at, deleted_at"
    )
    .single()
  if (error) throw error
  return communityPostSchema.parse({
    ...data,
    author_full_name: null,
    author_avatar_url: null,
  })
}

export async function softDeleteCommunityPost(
  supabase: SupabaseClient,
  postId: number
): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .is("deleted_at", null)
  if (error) throw error
}

export async function toggleCommunityPostLike(
  supabase: SupabaseClient,
  userId: string,
  input: ToggleCommunityPostLikeInput
): Promise<{ liked: boolean }> {
  const parsed = toggleCommunityPostLikeInputSchema.parse(input)
  if (parsed.liked) {
    const { error } = await supabase.from("community_post_likes").insert({
      post_id: parsed.post_id,
      user_id: userId,
      organization_id: parsed.organization_id,
      space_id: parsed.space_id,
    })
    if (error) throw error
    return { liked: true }
  }
  const { error } = await supabase
    .from("community_post_likes")
    .delete()
    .eq("post_id", parsed.post_id)
    .eq("user_id", userId)
  if (error) throw error
  return { liked: false }
}

export type CommunityPostCommentsPage = {
  items: CommunityPostComment[]
  nextCursor: CommunityFeedPostsCursor | null
}

export async function fetchCommunityPostCommentsPage(
  supabase: SupabaseClient,
  postId: number,
  options?: { cursor?: CommunityFeedPostsCursor | null; limit?: number }
): Promise<CommunityPostCommentsPage> {
  const limit = Math.min(40, Math.max(1, options?.limit ?? 20))
  const cursor = options?.cursor
    ? communityFeedPostsCursorSchema.parse(options.cursor)
    : null

  let query = supabase
    .from("community_post_comments")
    .select(
      "id, post_id, organization_id, space_id, author_user_id, body, created_at, updated_at, deleted_at, profiles!community_post_comments_author_user_id_fkey(full_name, avatar_url)"
    )
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1)

  if (cursor) {
    query = query.or(
      `created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const mapped = (data ?? []).map((row) => {
    const profileRaw = row.profiles
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
    return communityPostCommentSchema.parse({
      id: row.id,
      post_id: row.post_id,
      organization_id: row.organization_id,
      space_id: row.space_id,
      author_user_id: row.author_user_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      author_full_name:
        profile && typeof profile === "object" && "full_name" in profile
          ? readOptionalString(profile.full_name)
          : null,
      author_avatar_url:
        profile && typeof profile === "object" && "avatar_url" in profile
          ? readOptionalString(profile.avatar_url)
          : null,
    })
  })

  const hasMore = mapped.length > limit
  const items = hasMore ? mapped.slice(0, limit) : mapped
  const last = items[items.length - 1]
  return {
    items,
    nextCursor:
      hasMore && last
        ? { created_at: last.created_at, id: last.id }
        : null,
  }
}

export async function createCommunityPostComment(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCommunityPostCommentInput
): Promise<CommunityPostComment> {
  const parsed = createCommunityPostCommentInputSchema.parse(input)
  const { data, error } = await supabase
    .from("community_post_comments")
    .insert({
      post_id: parsed.post_id,
      organization_id: parsed.organization_id,
      space_id: parsed.space_id,
      author_user_id: userId,
      body: parsed.body,
    })
    .select(
      "id, post_id, organization_id, space_id, author_user_id, body, created_at, updated_at, deleted_at"
    )
    .single()
  if (error) throw error
  return communityPostCommentSchema.parse({
    ...data,
    author_full_name: null,
    author_avatar_url: null,
  })
}

export async function softDeleteCommunityPostComment(
  supabase: SupabaseClient,
  commentId: number
): Promise<void> {
  const { error } = await supabase
    .from("community_post_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .is("deleted_at", null)
  if (error) throw error
}

export async function fetchCanPostToCommunityFeed(
  supabase: SupabaseClient,
  feedId: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_post_to_community_feed", {
    p_feed_id: feedId,
  })
  if (error) throw error
  return data === true
}

export async function fetchIsCommunitySpaceStaff(
  supabase: SupabaseClient,
  spaceId: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_community_space_staff", {
    p_space_id: spaceId,
  })
  if (error) throw error
  return data === true
}

export type OrgAccessDirectoryPage = {
  items: Omit<OrgAccessDirectoryRow, "total_count">[]
  total: number
  page: number
  pageSize: number
}

export async function fetchOrgAccessDirectoryPage(
  supabase: SupabaseClient,
  organizationId: number,
  options?: {
    q?: string
    origins?: OrgAccessOrigin[]
    page?: number
    pageSize?: number
  }
): Promise<OrgAccessDirectoryPage> {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25))
  const origins = options?.origins ?? []
  const { data, error } = await supabase.rpc("org_access_directory_page", {
    p_organization_id: organizationId,
    p_q: options?.q?.trim() || null,
    p_origin: null,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_origins: origins.length > 0 ? origins : null,
  })
  if (error) throw error

  const rows = z.array(orgAccessDirectoryRowSchema).parse(
    (data ?? []).map((row) => {
      const originsRaw =
        row && typeof row === "object" && "origins" in row ? row.origins : []
      const totalRaw =
        row && typeof row === "object" && "total_count" in row
          ? row.total_count
          : 0
      return {
        user_id: row.user_id,
        full_name: row.full_name ?? null,
        avatar_url: row.avatar_url ?? null,
        email: row.email ?? null,
        origins: Array.isArray(originsRaw)
          ? originsRaw.map((o) => orgAccessOriginSchema.parse(String(o)))
          : [],
        total_count: Number(totalRaw ?? 0),
      }
    })
  )

  const total = rows[0]?.total_count ?? 0
  return {
    items: rows.map(({ total_count: _t, ...rest }) => rest),
    total,
    page,
    pageSize,
  }
}
