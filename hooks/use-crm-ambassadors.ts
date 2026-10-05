"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createAmbassadorLink,
  fetchAmbassadorLinks,
  type FetchAmbassadorLinksScope,
  updateAmbassadorLinkStatus,
} from "@/lib/services/crm-ambassadors"
import type { AmbassadorLinkStatus, CreateAmbassadorLinkInput } from "@/schemas/crm.schema"

export type UseCrmAmbassadorLinksParams = {
  organizationId: number | null
  /** When null, the query is disabled (e.g. member scope but missing membership id). */
  scope: FetchAmbassadorLinksScope | null
}

export function useCrmAmbassadorLinks(params: UseCrmAmbassadorLinksParams) {
  const { organizationId, scope } = params
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: [
      "crm-ambassador-links",
      organizationId,
      scope?.kind ?? "none",
      scope?.kind === "member" ? scope.memberId : null,
      scope?.kind === "bu" ? scope.businessUnitIds.join(",") : null,
    ],
    queryFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      if (!scope) throw new Error("scope is required to load ambassador links")
      return fetchAmbassadorLinks(supabase, organizationId, scope)
    },
    enabled: !!organizationId && scope != null,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCreateCrmAmbassadorLink(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAmbassadorLinkInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      return createAmbassadorLink(supabase, organizationId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-ambassador-links", organizationId], exact: false })
      toast.success("Link created")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

export function useUpdateCrmAmbassadorLinkStatus(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vars: { id: number; status: AmbassadorLinkStatus }) => {
      return updateAmbassadorLinkStatus(supabase, vars.id, vars.status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-ambassador-links", organizationId], exact: false })
      toast.success("Link updated")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

