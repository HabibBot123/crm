"use client"

import { useQueries } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCrmSalesAnalytics,
  type AnalyticsPreset,
} from "@/lib/services/analytics"
import type { CrmSalesAnalytics } from "@/schemas/analytics.schema"

export function useCrmSalesAnalytics(
  organizationId: number | null,
  options: {
    from: string
    to: string
    previousFrom?: string
    previousTo?: string
    businessUnitId?: number | null
    preset?: AnalyticsPreset
    enabled?: boolean
  }
) {
  const { supabase } = useAuth()
  const preset = options.preset ?? "custom"
  const enabled =
    !!organizationId &&
    options.enabled !== false &&
    options.from.length > 0 &&
    options.to.length > 0

  const compareEnabled =
    enabled &&
    !!options.previousFrom &&
    !!options.previousTo &&
    options.previousFrom.length > 0 &&
    options.previousTo.length > 0

  const [currentQuery, previousQuery] = useQueries({
    queries: [
      {
        queryKey: [
          "crm-sales-analytics",
          organizationId,
          options.from,
          options.to,
          options.businessUnitId ?? null,
          preset,
        ],
        queryFn: (): Promise<CrmSalesAnalytics> => {
          if (!organizationId) throw new Error("organizationId is required")
          return fetchCrmSalesAnalytics(supabase, {
            organizationId,
            from: options.from,
            to: options.to,
            businessUnitId: options.businessUnitId,
            preset,
          })
        },
        enabled,
      },
      {
        queryKey: [
          "crm-sales-analytics",
          organizationId,
          options.previousFrom ?? "",
          options.previousTo ?? "",
          options.businessUnitId ?? null,
          "custom",
        ],
        queryFn: (): Promise<CrmSalesAnalytics> => {
          if (!organizationId) throw new Error("organizationId is required")
          if (!options.previousFrom || !options.previousTo) {
            throw new Error("previous range is required")
          }
          return fetchCrmSalesAnalytics(supabase, {
            organizationId,
            from: options.previousFrom,
            to: options.previousTo,
            businessUnitId: options.businessUnitId,
            preset: "custom",
          })
        },
        enabled: compareEnabled,
      },
    ],
  })

  return {
    data: currentQuery.data ?? null,
    previous: previousQuery.data ?? null,
    isLoading: currentQuery.isLoading || (compareEnabled && previousQuery.isLoading),
    error: currentQuery.error ?? previousQuery.error ?? null,
  }
}
