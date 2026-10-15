"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { useOptionalCurrentOrganization } from "@/components/providers/organization-provider"
import {
  getOrgPermissions,
  type OrgPermissions,
} from "@/lib/permissions/org-capabilities"
import { ownerCapabilityAccess } from "@/lib/permissions/capabilities"
import {
  fetchMemberCapabilityContext,
  fetchMyOrgStaffMembership,
  fallbackMemberCapabilityContext,
} from "@/lib/services/org-permissions"

export type OrgCapabilitiesResult = OrgPermissions & {
  isLoading: boolean
}

export type UseOrgCapabilitiesArgs = {
  /**
   * Explicit org (member app / coached host).
   * When omitted, uses dashboard `OrganizationProvider` current org.
   */
  organizationId?: number | null
}

/**
 * Org-scoped permissions + solo/team features. UX only; RLS is authoritative.
 *
 * - Dashboard: `useOrgCapabilities()` → current org from provider
 * - Member app: `useOrgCapabilities({ organizationId })` → staff membership
 *   for that org (null membership = community-only → no staff caps)
 */
export function useOrgCapabilities(
  args?: UseOrgCapabilitiesArgs
): OrgCapabilitiesResult {
  const { supabase, user } = useAuth()
  const dashboardOrg = useOptionalCurrentOrganization()

  const explicitOrgId = args?.organizationId
  const fromProvider = dashboardOrg?.currentOrganization ?? null

  const organizationId =
    explicitOrgId !== undefined ? explicitOrgId : (fromProvider?.id ?? null)

  const staffQuery = useQuery({
    queryKey: ["org-staff-membership", organizationId, user?.id],
    enabled:
      explicitOrgId !== undefined &&
      organizationId != null &&
      !!user?.id,
    queryFn: () => {
      if (organizationId == null || !user?.id) {
        throw new Error("organizationId and user required")
      }
      return fetchMyOrgStaffMembership(supabase, {
        organizationId,
        userId: user.id,
      })
    },
    staleTime: 60_000,
  })

  const memberRole =
    explicitOrgId !== undefined
      ? (staffQuery.data?.memberRole ?? null)
      : (fromProvider?.member_role ?? null)
  const memberId =
    explicitOrgId !== undefined
      ? (staffQuery.data?.memberId ?? null)
      : (fromProvider?.member_id ?? null)
  const orgMode =
    explicitOrgId !== undefined
      ? (staffQuery.data?.orgMode ?? null)
      : (fromProvider?.mode ?? null)

  const hasStaffContext =
    explicitOrgId !== undefined
      ? staffQuery.data != null
      : memberRole != null

  const capabilityQuery = useQuery({
    queryKey: ["org-member-capabilities", organizationId, memberRole, memberId],
    enabled: organizationId != null && hasStaffContext && memberRole != null,
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
    // Community-only (or no org): empty caps
    if (!hasStaffContext || memberRole == null) {
      return getOrgPermissions({
        memberRole: null,
        orgMode,
        access: fallbackMemberCapabilityContext().access,
        scope: "own",
        ownedBusinessUnitIds: [],
      })
    }

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
  }, [hasStaffContext, memberRole, orgMode, capabilityQuery.data])

  const staffLoading =
    explicitOrgId !== undefined &&
    organizationId != null &&
    !!user?.id &&
    staffQuery.isLoading

  const matrixLoading =
    organizationId != null &&
    hasStaffContext &&
    memberRole != null &&
    memberRole !== "owner" &&
    capabilityQuery.isLoading

  return {
    ...permissions,
    isLoading: staffLoading || matrixLoading,
  }
}

export type { OrgPermissions }
