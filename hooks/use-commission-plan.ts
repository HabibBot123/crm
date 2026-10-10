"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchOrgCommissionPlan,
  updateOrgCommissionPlan,
} from "@/lib/services/commission-plan"
import type { OrgCommissionPlan } from "@/lib/commissions/plan"

export function commissionPlanQueryKey(organizationId: number | null) {
  return ["commission-plan", organizationId] as const
}

export function useOrgCommissionPlan(organizationId: number | null) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: commissionPlanQueryKey(organizationId),
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchOrgCommissionPlan(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    plan: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type UpdateOrgCommissionPlanInput = {
  plan: OrgCommissionPlan
  successMessage?: string
}

export function useUpdateOrgCommissionPlan(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateOrgCommissionPlanInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      return updateOrgCommissionPlan(supabase, organizationId, input.plan)
    },
    onSuccess: async (plan, input) => {
      await queryClient.setQueryData(commissionPlanQueryKey(organizationId), plan)
      toast.success(input.successMessage ?? "Commission plan saved")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save commission plan")
    },
  })
}
