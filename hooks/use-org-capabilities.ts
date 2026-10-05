"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  getOrgPermissions,
  type OrgPermissions,
} from "@/lib/permissions/org-capabilities"
import { ownerCapabilityAccess } from "@/lib/permissions/capabilities"
import {
  fetchMemberCapabilityContext,
  fallbackMemberCapabilityContext,
} from "@/lib/services/org-permissions"

export type OrgCapabilitiesResult = OrgPermissions & {
  isLoading: boolean
}

/** Org-scoped permissions + solo/team features. UX only; RLS is authoritative. */
export function useOrgCapabilities(): OrgCapabilitiesResult {
  const { supabase } = useAuth()
  const { currentOrganization } = useCurrentOrganization()

  const organizationId = currentOrganization?.id ?? null
  const memberRole = currentOrganization?.member_role ?? null
  const memberId = currentOrganization?.member_id ?? null
  const orgMode = currentOrganization?.mode ?? null

  const capabilityQuery = useQuery({
    queryKey: ["org-member-capabilities", organizationId, memberRole, memberId],
    enabled: organizationId != null && memberRole != null,
    queryFn: () => {
      if (organizationId == null) {
        throw new Error("organizationId is required")
      }
      return fetchMemberCapabilityContext(supabase, {
        organizationId,
        memberRole,
        memberId,
      })
    },
    staleTime: 60_000,
  })

  const permissions = useMemo(() => {
    if (memberRole === "owner") {
      return getOrgPermissions({
        memberRole,
        orgMode,
        access: ownerCapabilityAccess(),
        scope: "org",
        ownedBusinessUnitIds: [],
      })
    }

    const ctx = capabilityQuery.data ?? fallbackMemberCapabilityContext()
    return getOrgPermissions({
      memberRole,
      orgMode,
      access: ctx.access,
      scope: ctx.scope,
      ownedBusinessUnitIds: ctx.ownedBusinessUnitIds,
    })
  }, [memberRole, orgMode, capabilityQuery.data])

  return {
    ...permissions,
    isLoading:
      organizationId != null &&
      memberRole != null &&
      memberRole !== "owner" &&
      capabilityQuery.isLoading,
  }
}

export type { OrgPermissions }
