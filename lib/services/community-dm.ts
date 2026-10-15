import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { readOptionalString } from "@/lib/user-display"
import {
  communityConversationSchema,
  communityMessageSchema,
  createCommunityMessageInputSchema,
  type CommunityConversation,
  type CommunityMessage,
  type CreateCommunityMessageInput,
} from "@/schemas/community.schema"

export async function getOrCreateCommunityDm(
  supabase: SupabaseClient,
  organizationId: number,
  otherUserId: string
): Promise<CommunityConversation> {
  const { data, error } = await supabase.rpc("get_or_create_community_dm", {
    p_organization_id: organizationId,
    p_other_user_id: otherUserId,
  })
  if (error) throw error
  return communityConversationSchema.parse(data)
}

export async function fetchMyCommunityConversations(
  supabase: SupabaseClient,
  organizationId: number,
  userId: string
): Promise<CommunityConversation[]> {
  const { data, error } = await supabase
    .from("community_conversation_participants")
    .select(
      "conversation_id, community_conversations!inner(id, organization_id, pair_key, created_at, updated_at)"
    )
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
  if (error) throw error

  const conversations = (data ?? [])
    .map((row) => {
      const raw = row.community_conversations
      const conv = Array.isArray(raw) ? raw[0] : raw
      if (!conv || typeof conv !== "object") return null
      return communityConversationSchema.parse(conv)
    })
    .filter((c): c is CommunityConversation => c != null)

  conversations.sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const enriched: CommunityConversation[] = []
  for (const conv of conversations) {
    const { data: peers, error: peersError } = await supabase
      .from("community_conversation_participants")
      .select("user_id, profiles(full_name, avatar_url)")
      .eq("conversation_id", conv.id)
      .neq("user_id", userId)
      .limit(1)
    if (peersError) throw peersError
    const peer = peers?.[0]
    const profileRaw = peer?.profiles
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw

    const { data: lastRows, error: lastError } = await supabase
      .from("community_messages")
      .select("body, created_at")
      .eq("conversation_id", conv.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
    if (lastError) throw lastError
    const last = lastRows?.[0]

    enriched.push(
      communityConversationSchema.parse({
        ...conv,
        other_user_id: peer?.user_id,
        other_full_name:
          profile && typeof profile === "object" && "full_name" in profile
            ? readOptionalString(profile.full_name)
            : null,
        other_avatar_url:
          profile && typeof profile === "object" && "avatar_url" in profile
            ? readOptionalString(profile.avatar_url)
            : null,
        last_body: last?.body ?? null,
        last_at: last?.created_at ?? null,
      })
    )
  }

  return enriched
}

export async function fetchCommunityMessages(
  supabase: SupabaseClient,
  conversationId: number,
  options?: { limit?: number }
): Promise<CommunityMessage[]> {
  const limit = options?.limit ?? 100
  const { data, error } = await supabase
    .from("community_messages")
    .select(
      "id, organization_id, conversation_id, author_user_id, body, created_at, deleted_at, profiles!community_messages_author_user_id_fkey(full_name, avatar_url)"
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw error

  return z.array(communityMessageSchema).parse(
    (data ?? []).map((row) => {
      const profileRaw = row.profiles
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
      return {
        id: row.id,
        organization_id: row.organization_id,
        conversation_id: row.conversation_id,
        author_user_id: row.author_user_id,
        body: row.body,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        author_full_name:
          profile && typeof profile === "object" && "full_name" in profile
            ? readOptionalString(profile.full_name)
            : null,
        author_avatar_url:
          profile && typeof profile === "object" && "avatar_url" in profile
            ? readOptionalString(profile.avatar_url)
            : null,
      }
    })
  )
}

export async function createCommunityMessage(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCommunityMessageInput
): Promise<CommunityMessage> {
  const parsed = createCommunityMessageInputSchema.parse(input)
  const { data, error } = await supabase
    .from("community_messages")
    .insert({
      organization_id: parsed.organization_id,
      conversation_id: parsed.conversation_id,
      author_user_id: userId,
      body: parsed.body,
    })
    .select(
      "id, organization_id, conversation_id, author_user_id, body, created_at, deleted_at"
    )
    .single()
  if (error) throw error
  return communityMessageSchema.parse({
    ...data,
    author_full_name: null,
    author_avatar_url: null,
  })
}
