"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchDashboardOverview } from "@/lib/services/dashboard-overview"
import type { OverviewViewerMode } from "@/schemas/dashboard-overview.schema"

export function useDashboardOverview(
  organizationId: number | null,
  viewerMode: OverviewViewerMode,
  enabled = true
) {
  const { supabase } = useAuth()

  return useQuery({
    queryKey: ["dashboard-overview", organizationId, viewerMode],
    enabled: enabled && organizationId != null,
    queryFn: () => {
      if (organizationId == null) {
        throw new Error("organizationId is required")
      }
      return fetchDashboardOverview(supabase, organizationId, viewerMode)
    },
  })
}
