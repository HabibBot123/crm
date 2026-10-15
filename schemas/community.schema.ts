import { z } from "zod"

export const communitySpaceMemberRoleSchema = z.enum([
  "member",
  "moderator",
  "admin",
])

export const communityFeedWhoCanPostSchema = z.enum(["admins", "all"])
export type CommunityFeedWhoCanPost = z.infer<
  typeof communityFeedWhoCanPostSchema
>

export const communitySpaceSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const communityFeedSchema = z.object({
  id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  sort_order: z.number().int(),
  who_can_post: communityFeedWhoCanPostSchema,
  archived_at: z.string().nullable(),
  created_at: z.string(),
})

export const communitySpaceMemberSchema = z.object({
  id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  user_id: z.string().uuid(),
  role: communitySpaceMemberRoleSchema,
  source: z.enum(["manual", "enrollment_sync", "staff"]),
  joined_at: z.string(),
  left_at: z.string().nullable(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

export const communitySpaceOfferRuleInputSchema = z.object({
  offer_id: z.number().int().positive(),
  remove_on_expire: z.boolean().default(true),
})

export const communitySpaceMembershipRuleSchema = z.object({
  id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  offer_id: z.number().int().positive(),
  remove_on_expire: z.boolean(),
  created_at: z.string(),
  offer_name: z.string().nullable().optional(),
})

export const createCommunitySpaceInputSchema = z.object({
  organization_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  sync_clients: z.boolean().default(true),
  offer_rules: z.array(communitySpaceOfferRuleInputSchema).default([]),
})

export const addCommunitySpaceMemberInputSchema = z.object({
  space_id: z.number().int().positive(),
  user_id: z.string().uuid(),
})

export const addableCommunitySpaceMemberMatchSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("found"),
      user_id: z.string().uuid(),
      email: z.string().min(3),
      display_name: z.string().nullable(),
      kind: z.enum(["team", "client"]),
    }),
    z.object({
      status: z.literal("already_member"),
      user_id: z.string().uuid(),
      email: z.string().min(3),
      display_name: z.string().nullable(),
      kind: z.enum(["team", "client"]),
    }),
    z.object({
      status: z.literal("no_account"),
      email: z.string().min(3),
      display_name: z.string().nullable(),
      kind: z.literal("client"),
    }),
    z.object({
      status: z.literal("not_found"),
      email: z.string().min(3),
    }),
  ]
)

export const removeCommunitySpaceMemberInputSchema = z.object({
  space_id: z.number().int().positive(),
  user_id: z.string().uuid(),
})

export const updateCommunitySpaceInputSchema = z.object({
  space_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
})

export const createCommunityFeedInputSchema = z.object({
  space_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  who_can_post: communityFeedWhoCanPostSchema.default("all"),
})

export const updateCommunityFeedInputSchema = z.object({
  feed_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  who_can_post: communityFeedWhoCanPostSchema,
})

export const replaceCommunitySpaceMembershipRulesInputSchema = z.object({
  space_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  offer_rules: z.array(communitySpaceOfferRuleInputSchema),
  resync: z.boolean().default(true),
})

export const coachedCommunityOrgSchema = z.object({
  organization_id: z.number().int().positive(),
  organization_name: z.string(),
  organization_slug: z.string(),
  space_count: z.number().int().nonnegative(),
  logo_url: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
})

export const communityPostSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  feed_id: z.number().int().positive(),
  author_user_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
  author_full_name: z.string().nullable().optional(),
  author_avatar_url: z.string().nullable().optional(),
  like_count: z.number().int().nonnegative().optional(),
  comment_count: z.number().int().nonnegative().optional(),
  liked_by_me: z.boolean().optional(),
})

export const communityFeedPostsCursorSchema = z.object({
  created_at: z.string(),
  id: z.number().int().positive(),
})

export const communityPostCommentSchema = z.object({
  id: z.number().int().positive(),
  post_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  author_user_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable().optional(),
  author_full_name: z.string().nullable().optional(),
  author_avatar_url: z.string().nullable().optional(),
})

export const createCommunityPostInputSchema = z.object({
  organization_id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  feed_id: z.number().int().positive(),
  body: z.string().trim().min(1).max(5000),
})

export const createCommunityPostCommentInputSchema = z.object({
  post_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
})

export const toggleCommunityPostLikeInputSchema = z.object({
  post_id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  space_id: z.number().int().positive(),
  liked: z.boolean(),
})

export type CommunitySpace = z.infer<typeof communitySpaceSchema>
export type CommunityFeed = z.infer<typeof communityFeedSchema>
export type CommunitySpaceMember = z.infer<typeof communitySpaceMemberSchema>
export type CommunitySpaceOfferRuleInput = z.infer<
  typeof communitySpaceOfferRuleInputSchema
>
export type CommunitySpaceMembershipRule = z.infer<
  typeof communitySpaceMembershipRuleSchema
>
export type CreateCommunitySpaceInput = z.infer<
  typeof createCommunitySpaceInputSchema
>
export type AddCommunitySpaceMemberInput = z.infer<
  typeof addCommunitySpaceMemberInputSchema
>
export type AddableCommunitySpaceMemberMatch = z.infer<
  typeof addableCommunitySpaceMemberMatchSchema
>
export type RemoveCommunitySpaceMemberInput = z.infer<
  typeof removeCommunitySpaceMemberInputSchema
>
export type UpdateCommunitySpaceInput = z.infer<
  typeof updateCommunitySpaceInputSchema
>
export type CreateCommunityFeedInput = z.infer<
  typeof createCommunityFeedInputSchema
>
export type UpdateCommunityFeedInput = z.infer<
  typeof updateCommunityFeedInputSchema
>
export type ReplaceCommunitySpaceMembershipRulesInput = z.infer<
  typeof replaceCommunitySpaceMembershipRulesInputSchema
>
export type CoachedCommunityOrg = z.infer<typeof coachedCommunityOrgSchema>
export type CommunityPost = z.infer<typeof communityPostSchema>
export type CommunityFeedPostsCursor = z.infer<
  typeof communityFeedPostsCursorSchema
>
export type CommunityPostComment = z.infer<typeof communityPostCommentSchema>
export type CreateCommunityPostInput = z.infer<
  typeof createCommunityPostInputSchema
>
export type CreateCommunityPostCommentInput = z.infer<
  typeof createCommunityPostCommentInputSchema
>
export type ToggleCommunityPostLikeInput = z.infer<
  typeof toggleCommunityPostLikeInputSchema
>

export const orgAccessOriginSchema = z.enum([
  "staff",
  "enrollment",
  "community",
])

export const orgAccessDirectoryRowSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  email: z.string().nullable(),
  origins: z.array(orgAccessOriginSchema),
  total_count: z.number().int().nonnegative(),
})

export type OrgAccessOrigin = z.infer<typeof orgAccessOriginSchema>
export type OrgAccessDirectoryRow = z.infer<typeof orgAccessDirectoryRowSchema>

export const communityConversationSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  pair_key: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string(),
  other_user_id: z.string().uuid().optional(),
  other_full_name: z.string().nullable().optional(),
  other_avatar_url: z.string().nullable().optional(),
  last_body: z.string().nullable().optional(),
  last_at: z.string().nullable().optional(),
})

export const communityMessageSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  conversation_id: z.number().int().positive(),
  author_user_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
  created_at: z.string(),
  deleted_at: z.string().nullable().optional(),
  author_full_name: z.string().nullable().optional(),
  author_avatar_url: z.string().nullable().optional(),
})

export const createCommunityMessageInputSchema = z.object({
  organization_id: z.number().int().positive(),
  conversation_id: z.number().int().positive(),
  body: z.string().trim().min(1).max(5000),
})

export type CommunityConversation = z.infer<typeof communityConversationSchema>
export type CommunityMessage = z.infer<typeof communityMessageSchema>
export type CreateCommunityMessageInput = z.infer<
  typeof createCommunityMessageInputSchema
>
