import type { SupabaseClient } from "@supabase/supabase-js"
import {
  crmSalesAnalyticsSchema,
  type CrmSalesAnalytics,
} from "@/schemas/analytics.schema"

export type AnalyticsPreset = "7d" | "30d" | "month" | "year" | "custom"

export type FetchCrmSalesAnalyticsParams = {
  organizationId: number
  from: string
  to: string
  businessUnitId?: number | null
  preset?: AnalyticsPreset
}

export async function fetchCrmSalesAnalytics(
  supabase: SupabaseClient,
  params: FetchCrmSalesAnalyticsParams
): Promise<CrmSalesAnalytics> {
  const { data, error } = await supabase.rpc("crm_sales_analytics", {
    p_organization_id: params.organizationId,
    p_from: `${params.from}T00:00:00.000Z`,
    p_to: `${params.to}T23:59:59.999Z`,
    p_business_unit_id: params.businessUnitId ?? null,
    p_preset: params.preset ?? "custom",
  })
  if (error) throw error
  return crmSalesAnalyticsSchema.parse(data)
}
