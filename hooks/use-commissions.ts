"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  activateLeadCommissions,
  cancelLeadCommissions,
  fetchCommissions,
  fetchCommissionsDueTotalCents,
  findEnrollmentsForLeadEmail,
  linkLeadEnrollment,
  markCommissionsPaid,
} from "@/lib/services/commissions"
import type { ActivateLeadCommissionsInput, CommissionStatus } from "@/schemas/crm.schema"
import { toast } from "sonner"

export function useCommissions(
  organizationId: number | null,
  options: {
    page: number
    pageSize: number
    status?: CommissionStatus
    memberId?: number
  }
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: [
      "commissions",
      organizationId,
      options.page,
      options.pageSize,
      options.status ?? null,
      options.memberId ?? null,
    ],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCommissions(supabase, organizationId, options)
    },
    enabled: !!organizationId,
  })

  return {
    commissions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useCommissionsDueTotal(
  organizationId: number | null,
  options?: { memberId?: number }
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["commissions-due-total", organizationId, options?.memberId ?? null],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchCommissionsDueTotalCents(supabase, organizationId, options)
    },
    enabled: !!organizationId,
  })

  return {
    dueTotalCents: query.data ?? 0,
    isLoading: query.isLoading,
  }
}

export function useActivateLeadCommissions(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ActivateLeadCommissionsInput) => activateLeadCommissions(supabase, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead"] })
      await queryClient.invalidateQueries({ queryKey: ["commissions", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["commissions-due-total", organizationId] })
      toast.success("Commissions activated")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not activate commissions")
    },
  })
}

export function useCancelLeadCommissions(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (leadId: number) => cancelLeadCommissions(supabase, leadId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead"] })
      await queryClient.invalidateQueries({ queryKey: ["commissions", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["commissions-due-total", organizationId] })
      toast.success("Commissions canceled")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not cancel commissions")
    },
  })
}

export function useMarkCommissionsPaid(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { commissionIds: number[]; paidByMemberId: number }) =>
      markCommissionsPaid(supabase, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["commissions", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["commissions-due-total", organizationId] })
      toast.success("Marked as paid")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not mark as paid")
    },
  })
}

export function useLeadEnrollmentMatches(organizationId: number | null, email: string | null) {
  const { supabase } = useAuth()
  return useQuery({
    queryKey: ["lead-enrollment-matches", organizationId, email],
    queryFn: () => {
      if (!organizationId || !email) throw new Error("organizationId and email are required")
      return findEnrollmentsForLeadEmail(supabase, organizationId, email)
    },
    enabled: !!organizationId && !!email,
  })
}

export function useLinkLeadEnrollment(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      leadId: number
      enrollmentId: number | null
      saleSource?: "platform" | "manual" | null
    }) => linkLeadEnrollment(supabase, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead"] })
      toast.success("Sale link updated")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not link sale")
    },
  })
}
