"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useCoached } from "@/hooks/use-coached"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useCoachedCommunityOrgs, useMyCommunitySpaces } from "@/hooks/use-community"
import { fetchOrganizationBySlug } from "@/lib/services/organizations"

export function useCurrentCoachedOrg() {
  const { supabase } = useAuth()
  const { orgSlug, isOrgApp, isHub, ready } = useCoachedHost()
  const { coachedOrgs, coachedProducts, isLoading: productsLoading } =
    useCoached()
  const communityOrgs = useCoachedCommunityOrgs()
  const spacesQuery = useMyCommunitySpaces()

  const fromLists = useMemo(() => {
    if (!orgSlug) return null
    const fromEnrollment = coachedOrgs.find(
      (o) => o.organization_slug === orgSlug
    )
    if (fromEnrollment) return fromEnrollment
    const fromCommunity = (communityOrgs.data ?? []).find(
      (o) => o.organization_slug === orgSlug
    )
    if (fromCommunity) {
      return {
        organization_id: fromCommunity.organization_id,
        organization_name: fromCommunity.organization_name,
        organization_slug: fromCommunity.organization_slug,
      }
    }
    return null
  }, [orgSlug, coachedOrgs, communityOrgs.data])

  const orgQuery = useQuery({
    queryKey: ["coached-org-by-slug", orgSlug],
    enabled: !!orgSlug && !fromLists && ready,
    queryFn: async () => {
      if (!orgSlug) return null
      return fetchOrganizationBySlug(supabase, orgSlug)
    },
  })

  const org =
    fromLists ??
    (orgQuery.data
      ? {
          organization_id: orgQuery.data.id,
          organization_name: orgQuery.data.name,
          organization_slug: orgQuery.data.slug,
        }
      : null)

  const orgProducts = useMemo(() => {
    if (!org) return []
    return coachedProducts.filter((p) => p.organization_id === org.organization_id)
  }, [coachedProducts, org])

  const orgSpaces = useMemo(() => {
    if (!org) return []
    return (spacesQuery.data ?? []).filter(
      (s) => s.organization_id === org.organization_id
    )
  }, [spacesQuery.data, org])

  return {
    ready,
    isOrgApp,
    isHub,
    orgSlug,
    org,
    orgProducts,
    orgSpaces,
    isLoading:
      !ready ||
      productsLoading ||
      communityOrgs.isLoading ||
      spacesQuery.isLoading ||
      orgQuery.isLoading,
    hasAccess: !!org || (!!orgSlug && !!orgQuery.data),
  }
}
