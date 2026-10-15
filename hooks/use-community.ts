"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  addCommunitySpaceMember,
  archiveCommunityFeed,
  archiveCommunitySpace,
  createCommunityFeed,
  createCommunityPost,
  createCommunityPostComment,
  createCommunitySpace,
  fetchCanPostToCommunityFeed,
  fetchIsCommunitySpaceStaff,
  fetchCommunityFeedPostsPage,
  fetchCommunityPostCommentsPage,
  fetchCommunitySpaceByOrgAndSlug,
  fetchCommunitySpaceFeeds,
  fetchCommunitySpaceMembersPage,
  fetchCommunitySpaceMembershipRules,
  fetchCoachedCommunityOrgs,
  findAddableCommunitySpaceMemberByEmail,
  fetchMyCommunitySpaces,
  fetchOrgAccessDirectoryPage,
  fetchOrgCommunitySpaces,
  removeCommunitySpaceMember,
  replaceCommunitySpaceMembershipRules,
  softDeleteCommunityPost,
  softDeleteCommunityPostComment,
  syncCommunitySpaceMembersFromEnrollments,
  toggleCommunityPostLike,
  updateCommunityFeed,
  updateCommunitySpace,
} from "@/lib/services/community"
import type {
  CommunityFeedPostsCursor,
  CreateCommunityFeedInput,
  CreateCommunityPostCommentInput,
  CreateCommunityPostInput,
  CreateCommunitySpaceInput,
  OrgAccessOrigin,
  ReplaceCommunitySpaceMembershipRulesInput,
  ToggleCommunityPostLikeInput,
  UpdateCommunityFeedInput,
  UpdateCommunitySpaceInput,
} from "@/schemas/community.schema"

export function useOrgCommunitySpaces(organizationId: number | null) {
  const { supabase } = useAuth()
  return useQuery({
    queryKey: ["community-spaces", organizationId],
    enabled: organizationId != null,
    queryFn: () => {
      if (organizationId == null) throw new Error("organizationId required")
      return fetchOrgCommunitySpaces(supabase, organizationId)
    },
  })
}

export function useCreateCommunitySpaceMutation(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateCommunitySpaceInput, "organization_id">) => {
      if (organizationId == null) throw new Error("organizationId required")
      return createCommunitySpace(supabase, {
        organization_id: organizationId,
        ...input,
      })
    },
    onSuccess: (space) => {
      void queryClient.invalidateQueries({
        queryKey: ["community-spaces", organizationId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["community-space-membership-rules", space.id],
      })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useUpdateCommunitySpaceMutation(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<UpdateCommunitySpaceInput, "space_id"> & { space_id: number }
    ) => updateCommunitySpace(supabase, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-spaces", organizationId],
      })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useReplaceCommunitySpaceMembershipRulesMutation(
  organizationId: number | null
) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      input: Omit<ReplaceCommunitySpaceMembershipRulesInput, "organization_id">
    ) => {
      if (organizationId == null) throw new Error("organizationId required")
      return replaceCommunitySpaceMembershipRules(supabase, {
        organization_id: organizationId,
        ...input,
      })
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({
        queryKey: ["community-space-membership-rules", input.space_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ["community-space-members-page", input.space_id],
      })
      void queryClient.invalidateQueries({
        queryKey: ["community-spaces", organizationId],
      })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useArchiveCommunitySpaceMutation(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (spaceId: number) => archiveCommunitySpace(supabase, spaceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-spaces", organizationId],
      })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useSyncCommunitySpaceMembersMutation(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (spaceId: number) =>
      syncCommunitySpaceMembersFromEnrollments(supabase, spaceId),
    onSuccess: (_count, spaceId) => {
      void queryClient.invalidateQueries({
        queryKey: ["community-space-members-page", spaceId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["community-spaces", organizationId],
      })
    },
  })
}

export function useCommunitySpaceMembershipRules(spaceId: number | null) {
  const { supabase } = useAuth()
  return useQuery({
    queryKey: ["community-space-membership-rules", spaceId],
    enabled: spaceId != null,
    queryFn: () => {
      if (spaceId == null) throw new Error("spaceId required")
      return fetchCommunitySpaceMembershipRules(supabase, spaceId)
    },
  })
}

export function useAddCommunitySpaceMemberMutation(spaceId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (spaceId == null) throw new Error("spaceId required")
      return addCommunitySpaceMember(supabase, {
        space_id: spaceId,
        user_id: userId,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-space-members-page", spaceId],
      })
      void queryClient.invalidateQueries({ queryKey: ["org-access-directory"] })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useRemoveCommunitySpaceMemberMutation(spaceId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (spaceId == null) throw new Error("spaceId required")
      return removeCommunitySpaceMember(supabase, {
        space_id: spaceId,
        user_id: userId,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-space-members-page", spaceId],
      })
      void queryClient.invalidateQueries({ queryKey: ["org-access-directory"] })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
    },
  })
}

export function useCoachedCommunityOrgs() {
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null
  return useQuery({
    queryKey: ["coached-community", "orgs", userId],
    enabled: !!userId,
    queryFn: () => {
      if (!userId) throw new Error("user required")
      return fetchCoachedCommunityOrgs(supabase, userId)
    },
  })
}

export function useMyCommunitySpaces(organizationId?: number | null) {
  const { supabase, user } = useAuth()
  return useQuery({
    queryKey: ["coached-community", "spaces", user?.id, organizationId ?? "all"],
    enabled: !!user,
    queryFn: () =>
      fetchMyCommunitySpaces(
        supabase,
        organizationId != null ? { organizationId } : undefined
      ),
  })
}

export function useCommunitySpaceBySlugs(
  orgSlug: string | null,
  spaceSlug: string | null
) {
  const { supabase } = useAuth()
  return useQuery({
    queryKey: ["coached-community", "space", orgSlug, spaceSlug],
    enabled: !!orgSlug && !!spaceSlug,
    queryFn: () => {
      if (!orgSlug || !spaceSlug) throw new Error("slugs required")
      return fetchCommunitySpaceByOrgAndSlug(supabase, orgSlug, spaceSlug)
    },
  })
}

export function useCommunitySpaceFeeds(spaceId: number | null) {
  const { supabase } = useAuth()
  return useQuery({
    queryKey: ["community-feeds", spaceId],
    enabled: spaceId != null,
    queryFn: () => {
      if (spaceId == null) throw new Error("spaceId required")
      return fetchCommunitySpaceFeeds(supabase, spaceId)
    },
  })
}

export function useCreateCommunityFeedMutation(spaceId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateCommunityFeedInput, "space_id">) => {
      if (spaceId == null) throw new Error("spaceId required")
      return createCommunityFeed(supabase, { space_id: spaceId, ...input })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-feeds", spaceId],
      })
    },
  })
}

export function useUpdateCommunityFeedMutation(spaceId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCommunityFeedInput) =>
      updateCommunityFeed(supabase, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-feeds", spaceId],
      })
    },
  })
}

export function useArchiveCommunityFeedMutation(spaceId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedId: number) => archiveCommunityFeed(supabase, feedId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-feeds", spaceId],
      })
    },
  })
}

export function useFindAddableCommunitySpaceMemberByEmail(
  organizationId: number | null,
  spaceId: number | null
) {
  const { supabase } = useAuth()
  return useMutation({
    mutationFn: (email: string) => {
      if (organizationId == null) throw new Error("organizationId required")
      if (spaceId == null) throw new Error("spaceId required")
      return findAddableCommunitySpaceMemberByEmail(supabase, {
        organizationId,
        spaceId,
        email,
      })
    },
  })
}

export function useCommunitySpaceMembersPage(
  spaceId: number | null,
  options: { q: string; page: number; pageSize?: number }
) {
  const { supabase } = useAuth()
  const pageSize = options.pageSize ?? 24
  return useQuery({
    queryKey: [
      "community-space-members-page",
      spaceId,
      options.q,
      options.page,
      pageSize,
    ],
    enabled: spaceId != null,
    queryFn: () => {
      if (spaceId == null) throw new Error("spaceId required")
      return fetchCommunitySpaceMembersPage(supabase, spaceId, {
        q: options.q,
        page: options.page,
        pageSize,
      })
    },
    placeholderData: (prev) => prev,
  })
}

export function useOrgAccessDirectoryPage(
  organizationId: number | null,
  options: {
    q: string
    origins: OrgAccessOrigin[]
    page: number
    pageSize?: number
    enabled?: boolean
  }
) {
  const { supabase } = useAuth()
  const pageSize = options.pageSize ?? 25
  return useQuery({
    queryKey: [
      "org-access-directory",
      organizationId,
      options.q,
      options.origins,
      options.page,
      pageSize,
    ],
    enabled: organizationId != null && (options.enabled ?? true),
    queryFn: () => {
      if (organizationId == null) throw new Error("organizationId required")
      return fetchOrgAccessDirectoryPage(supabase, organizationId, {
        q: options.q,
        origins: options.origins,
        page: options.page,
        pageSize,
      })
    },
    placeholderData: (prev) => prev,
  })
}

export function useCommunityFeedPosts(feedId: number | null) {
  const { supabase, user } = useAuth()
  return useInfiniteQuery({
    queryKey: ["community-posts", feedId, user?.id ?? null],
    enabled: feedId != null,
    initialPageParam: null as CommunityFeedPostsCursor | null,
    queryFn: ({ pageParam }) => {
      if (feedId == null) throw new Error("feedId required")
      return fetchCommunityFeedPostsPage(supabase, feedId, {
        cursor: pageParam,
        limit: 20,
        userId: user?.id ?? null,
      })
    },
    getNextPageParam: (last) => last.nextCursor,
  })
}

export function useCommunityPostComments(
  postId: number | null,
  enabled: boolean
) {
  const { supabase } = useAuth()
  return useInfiniteQuery({
    queryKey: ["community-post-comments", postId],
    enabled: postId != null && enabled,
    initialPageParam: null as CommunityFeedPostsCursor | null,
    queryFn: ({ pageParam }) => {
      if (postId == null) throw new Error("postId required")
      return fetchCommunityPostCommentsPage(supabase, postId, {
        cursor: pageParam,
        limit: 20,
      })
    },
    getNextPageParam: (last) => last.nextCursor,
  })
}

export function useCanPostToCommunityFeed(feedId: number | null) {
  const { supabase, user } = useAuth()
  return useQuery({
    queryKey: ["community-can-post", feedId, user?.id],
    enabled: feedId != null && !!user,
    queryFn: () => {
      if (feedId == null) throw new Error("feedId required")
      return fetchCanPostToCommunityFeed(supabase, feedId)
    },
    staleTime: 30_000,
  })
}

export function useIsCommunitySpaceStaff(spaceId: number | null) {
  const { supabase, user } = useAuth()
  return useQuery({
    queryKey: ["community-space-staff", spaceId, user?.id],
    enabled: spaceId != null && !!user,
    queryFn: () => {
      if (spaceId == null) throw new Error("spaceId required")
      return fetchIsCommunitySpaceStaff(supabase, spaceId)
    },
    staleTime: 30_000,
  })
}

export function useCreateCommunityPostMutation(feedId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommunityPostInput) => {
      if (!user?.id) throw new Error("Not authenticated")
      return createCommunityPost(supabase, user.id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-posts", feedId],
      })
    },
  })
}

export function useSoftDeleteCommunityPostMutation(feedId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => softDeleteCommunityPost(supabase, postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-posts", feedId],
      })
    },
  })
}

export function useToggleCommunityPostLikeMutation(feedId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ToggleCommunityPostLikeInput) => {
      if (!user?.id) throw new Error("Not authenticated")
      return toggleCommunityPostLike(supabase, user.id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-posts", feedId],
      })
    },
  })
}

export function useCreateCommunityPostCommentMutation(postId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommunityPostCommentInput) => {
      if (!user?.id) throw new Error("Not authenticated")
      return createCommunityPostComment(supabase, user.id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-post-comments", postId],
      })
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}

export function useSoftDeleteCommunityPostCommentMutation(
  postId: number | null
) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) =>
      softDeleteCommunityPostComment(supabase, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-post-comments", postId],
      })
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] })
    },
  })
}
