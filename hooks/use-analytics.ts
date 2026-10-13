"use client"

import { useQueries } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCrmMarketingAnalytics,
  fetchCrmSalesAnalytics,
  type AnalyticsPreset,
} from "@/lib/services/analytics"
import type {
  AnalyticsViewerMode,
  CrmMarketingAnalytics,
  CrmSalesAnalytics,
} from "@/schemas/analytics.schema"

export function useCrmSalesAnalytics(
  organizationId: number | null,
  options: {
    from: string
    to: string
    previousFrom?: string
    previousTo?: string
    businessUnitId?: number | null
    preset?: AnalyticsPreset
    viewerMode?: AnalyticsViewerMode | null
    enabled?: boolean
  }
) {
  const { supabase } = useAuth()
  const preset = options.preset ?? "custom"
  const viewerMode = options.viewerMode ?? null
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
          viewerMode,
        ],
        queryFn: (): Promise<CrmSalesAnalytics> => {
          if (!organizationId) throw new Error("organizationId is required")
          return fetchCrmSalesAnalytics(supabase, {
            organizationId,
            from: options.from,
            to: options.to,
            businessUnitId: options.businessUnitId,
            preset,
            viewerMode,
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
          viewerMode,
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
            viewerMode,
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

export function useCrmMarketingAnalytics(
  organizationId: number | null,
  options: {
    from: string
    to: string
    previousFrom?: string
    previousTo?: string
    businessUnitId?: number | null
    enabled?: boolean
  }
) {
  const { supabase } = useAuth()
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
          "crm-marketing-analytics",
          organizationId,
          options.from,
          options.to,
          options.businessUnitId ?? null,
        ],
        queryFn: (): Promise<CrmMarketingAnalytics> => {
          if (!organizationId) throw new Error("organizationId is required")
          return fetchCrmMarketingAnalytics(supabase, {
            organizationId,
            from: options.from,
            to: options.to,
            businessUnitId: options.businessUnitId,
          })
        },
        enabled,
      },
      {
        queryKey: [
          "crm-marketing-analytics",
          organizationId,
          options.previousFrom ?? "",
          options.previousTo ?? "",
          options.businessUnitId ?? null,
        ],
        queryFn: (): Promise<CrmMarketingAnalytics> => {
          if (!organizationId) throw new Error("organizationId is required")
          if (!options.previousFrom || !options.previousTo) {
            throw new Error("previous range is required")
          }
          return fetchCrmMarketingAnalytics(supabase, {
            organizationId,
            from: options.previousFrom,
            to: options.previousTo,
            businessUnitId: options.businessUnitId,
          })
        },
        enabled: compareEnabled,
      },
    ],
  })

  return {
    data: currentQuery.data ?? null,
    previous: previousQuery.data ?? null,
    isLoading:
      currentQuery.isLoading || (compareEnabled && previousQuery.isLoading),
    error: currentQuery.error ?? previousQuery.error ?? null,
  }
}
