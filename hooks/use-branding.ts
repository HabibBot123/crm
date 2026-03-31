"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchOrganizationBranding,
  type UpdateOrganizationBrandingInput,
  updateOrganizationBranding,
} from "@/lib/services/organizations"

/** Dashboard branding: load JSON (RLS) + save updates. */
export function useBranding(organizationId: number | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["organization-branding", organizationId],
    queryFn: () => {
      if (organizationId == null) {
        throw new Error("No organization selected")
      }
      return fetchOrganizationBranding(supabase, organizationId)
    },
    enabled: Boolean(user && organizationId != null),
  })

  const mutation = useMutation({
    mutationFn: async (input: UpdateOrganizationBrandingInput) => {
      if (!organizationId) throw new Error("No organization selected")
      return updateOrganizationBranding(supabase, organizationId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      if (organizationId != null) {
        queryClient.invalidateQueries({ queryKey: ["organization-branding", organizationId] })
      }
      queryClient.invalidateQueries({ queryKey: ["public-org"] })
      queryClient.invalidateQueries({ queryKey: ["public-offer"] })
      toast.success("Branding saved")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return {
    ...query,
    saveBranding: mutation.mutate,
    saveBrandingAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}

