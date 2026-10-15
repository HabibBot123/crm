"use client"

import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  createCommunityMessage,
  fetchCommunityMessages,
  fetchMyCommunityConversations,
  getOrCreateCommunityDm,
} from "@/lib/services/community-dm"
import type { CreateCommunityMessageInput } from "@/schemas/community.schema"

export function useMyCommunityConversations(organizationId: number | null) {
  const { supabase, user } = useAuth()
  return useQuery({
    queryKey: ["community-conversations", organizationId, user?.id],
    enabled: organizationId != null && !!user,
    queryFn: () => {
      if (organizationId == null || !user?.id) {
        throw new Error("org and user required")
      }
      return fetchMyCommunityConversations(supabase, organizationId, user.id)
    },
  })
}

export function useGetOrCreateCommunityDmMutation(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (otherUserId: string) => {
      if (organizationId == null) throw new Error("organizationId required")
      return getOrCreateCommunityDm(supabase, organizationId, otherUserId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-conversations", organizationId],
      })
    },
  })
}

export function useCommunityMessages(conversationId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["community-messages", conversationId],
    enabled: conversationId != null && !!user,
    queryFn: () => {
      if (conversationId == null) throw new Error("conversationId required")
      return fetchCommunityMessages(supabase, conversationId)
    },
  })

  useEffect(() => {
    if (conversationId == null || !user) return
    const channel = supabase
      .channel(`community-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["community-messages", conversationId],
          })
          void queryClient.invalidateQueries({
            queryKey: ["community-conversations"],
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient, supabase, user])

  return query
}

export function useCreateCommunityMessageMutation(conversationId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommunityMessageInput) => {
      if (!user?.id) throw new Error("Not authenticated")
      return createCommunityMessage(supabase, user.id, input)
    },
    onMutate: async (input) => {
      if (!user?.id || conversationId == null) return { previous: undefined }
      const queryKey = ["community-messages", conversationId] as const
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      const optimistic = {
        id: -Date.now(),
        organization_id: input.organization_id,
        conversation_id: input.conversation_id,
        author_user_id: user.id,
        body: input.body,
        created_at: new Date().toISOString(),
        deleted_at: null,
        author_full_name: null,
        author_avatar_url: null,
      }
      queryClient.setQueryData(queryKey, (old: unknown) => {
        if (!Array.isArray(old)) return [optimistic]
        return [...old, optimistic]
      })
      return { previous, queryKey }
    },
    onError: (_err, _input, context) => {
      if (context?.previous !== undefined && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["community-messages", conversationId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["community-conversations"],
      })
    },
  })
}
