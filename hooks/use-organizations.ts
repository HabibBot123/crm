"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchOrganizationsWithMember, type Organization } from "@/lib/services/organizations"

export function useOrganizations() {
  const { supabase, user } = useAuth()

  const query = useQuery({
    queryKey: ["organizations", user?.id],
    queryFn: () => fetchOrganizationsWithMember(supabase, user!.id),
    enabled: !!user,
  })

  const organizations = (query.data ?? []) as Organization[]

  return {
    organizations,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export type { Organization }
