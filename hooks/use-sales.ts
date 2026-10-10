"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchOrganizationSales,
  fetchSaleSheetRelated,
  type OrganizationSaleListItem,
  type OrganizationSalesFilters,
} from "@/lib/services/sales"
import type { RecordLeadSaleInput } from "@/schemas/crm.schema"

export function useOrganizationSales(
  organizationId: number | null,
  options: OrganizationSalesFilters
) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: [
      "organization-sales",
      organizationId,
      options.page,
      options.pageSize,
      options.search ?? "",
      options.paymentKinds?.join(",") ?? "",
      options.sources?.join(",") ?? "",
      options.offerIds?.join(",") ?? "",
      options.amountMinCents ?? "",
      options.amountMaxCents ?? "",
    ],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchOrganizationSales(supabase, organizationId, options)
    },
    enabled: !!organizationId,
  })

  return {
    sales: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useSaleSheetRelated(
  organizationId: number | null,
  sale: OrganizationSaleListItem | null,
  open: boolean
) {
  const { supabase } = useAuth()
  const saleId = sale?.id ?? null

  const query = useQuery({
    queryKey: ["sale-sheet-related", organizationId, saleId],
    queryFn: () => {
      if (!organizationId || !sale) throw new Error("organizationId and sale are required")
      return fetchSaleSheetRelated(supabase, organizationId, sale)
    },
    enabled: open && !!organizationId && !!saleId,
  })

  return {
    client: query.data?.client ?? null,
    lead: query.data?.lead ?? null,
    commissions: query.data?.commissions ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useRecordLeadSale(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { leadId: number; input: RecordLeadSaleInput }) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/leads/${variables.leadId}/record-sale`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variables.input),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message =
          body && typeof body.error === "string" ? body.error : "Failed to record sale"
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-leads", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["crm-lead"] })
      await queryClient.invalidateQueries({ queryKey: ["lead-enrollment-matches"] })
      await queryClient.invalidateQueries({ queryKey: ["organization-sales", organizationId] })
      await queryClient.invalidateQueries({ queryKey: ["clients", organizationId] })
      toast.success("Sale recorded")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not record sale")
    },
  })
}
