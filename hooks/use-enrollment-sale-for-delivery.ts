"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchEnrollmentSaleForDelivery } from "@/lib/services/commissions"

export function enrollmentSaleForDeliveryQueryKey(
  organizationId: number | null,
  enrollmentId: number | null
) {
  return ["enrollment-sale-delivery", organizationId, enrollmentId] as const
}

export function useEnrollmentSaleForDelivery(params: {
  organizationId: number | null
  enrollmentId: number | null
  enabled?: boolean
}) {
  const { organizationId, enrollmentId, enabled = true } = params
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: enrollmentSaleForDeliveryQueryKey(organizationId, enrollmentId),
    queryFn: () => {
      if (!organizationId || enrollmentId == null) {
        throw new Error("organizationId and enrollmentId required")
      }
      return fetchEnrollmentSaleForDelivery(supabase, organizationId, enrollmentId)
    },
    enabled: enabled && !!organizationId && enrollmentId != null && !!supabase,
  })

  return {
    sale: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
