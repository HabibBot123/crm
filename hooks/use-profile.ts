"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchMyProfile, updateMyProfile } from "@/lib/services/profiles"
import type { UpdateProfileInput } from "@/schemas/profile.schema"

export function useMyProfile() {
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: () => {
      if (!userId) throw new Error("user required")
      return fetchMyProfile(supabase, userId)
    },
  })
}

export function useUpdateMyProfileMutation() {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => {
      if (!user?.id) throw new Error("Not authenticated")
      return updateMyProfile(supabase, user.id, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })
    },
  })
}

export function useUploadAvatarMutation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.set("file", file)
      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Upload failed"
        throw new Error(message)
      }
      if (
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof data.url !== "string"
      ) {
        throw new Error("Invalid upload response")
      }
      return data.url
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })
      void queryClient.invalidateQueries({ queryKey: ["coached-community"] })
      void queryClient.invalidateQueries({ queryKey: ["community-posts"] })
      void queryClient.invalidateQueries({
        queryKey: ["community-space-members-page"],
      })
    },
  })
}
