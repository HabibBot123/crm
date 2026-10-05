"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import type { OrgCapability } from "@/lib/permissions/capabilities"
import {
  fetchOrganizationRolePermissions,
  updateOrganizationRolePermission,
  type MatrixRole,
} from "@/lib/services/org-permissions"

export function useOrganizationRolePermissions(organizationId: number | null) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["org-role-permissions", organizationId],
    enabled: organizationId != null,
    queryFn: () => {
      if (organizationId == null) {
        throw new Error("organizationId is required")
      }
      return fetchOrganizationRolePermissions(supabase, organizationId)
    },
  })
}

export function useUpdateOrganizationRolePermission(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: {
      role: MatrixRole
      capability: OrgCapability
      allowed: boolean
    }) => {
      if (organizationId == null) {
        throw new Error("organizationId is required")
      }
      await updateOrganizationRolePermission(supabase, {
        organizationId,
        role: vars.role,
        capability: vars.capability,
        allowed: vars.allowed,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org-role-permissions", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["org-member-capabilities"] })
      toast.success("Permission updated")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update permission")
    },
  })
}
