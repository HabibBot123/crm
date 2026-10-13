import type { SupabaseClient } from "@supabase/supabase-js"
import {
  dashboardOverviewSchema,
  type DashboardOverview,
  type OverviewViewerMode,
} from "@/schemas/dashboard-overview.schema"

export async function fetchDashboardOverview(
  supabase: SupabaseClient,
  organizationId: number,
  viewerMode: OverviewViewerMode
): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc("dashboard_overview", {
    p_organization_id: organizationId,
    p_viewer_mode: viewerMode,
  })
  if (error) throw error
  return dashboardOverviewSchema.parse(data)
}
