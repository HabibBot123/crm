"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchOrganizationsByIds, type OrganizationDisplay } from "@/lib/services/organizations"

type OrganizationsClaim = {
  organization_id: number
  roles: string[]
  organization_member_ids: number[]
}

export function useOrganizations() {
  const { supabase, user } = useAuth()
  const organizationsClaim = (user?.app_metadata?.organizations ?? []) as OrganizationsClaim[]
  const orgIds = organizationsClaim.map((o) => o.organization_id)

  const query = useQuery({
    queryKey: ["organizations", orgIds],
    queryFn: () => fetchOrganizationsByIds(supabase, orgIds),
    enabled: !!user && orgIds.length > 0,
  })

  return {
    organizations: (query.data ?? []) as OrganizationDisplay[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
