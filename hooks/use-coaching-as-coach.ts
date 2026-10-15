"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchCoachingPacksAsCoach } from "@/lib/services/coached"

export function useCoachingPacksAsCoach(organizationId: number | null) {
  const { supabase, user } = useAuth()
  return useQuery({
    queryKey: ["coaching-as-coach", organizationId, user?.id],
    enabled: organizationId != null && !!user?.id,
    queryFn: () => {
      if (organizationId == null || !user?.id) {
        throw new Error("org and user required")
      }
      return fetchCoachingPacksAsCoach(supabase, organizationId, user.id)
    },
  })
}
