"use client"

import { useMemo } from "react"
import { useCoached } from "@/hooks/use-coached"
import { useCoachingPacksAsCoach } from "@/hooks/use-coaching-as-coach"
import type { CoachedProduct } from "@/hooks/use-coached"
import type { CoachedCoachPack } from "@/lib/services/coached"

export type OrgCoachingInbox = {
  asClient: CoachedProduct[]
  asCoach: CoachedCoachPack[]
  isEmpty: boolean
  isLoading: boolean
}

/** Client enrollments + assigned coach packs for one org (shared by Home + /coaching). */
export function useOrgCoachingInbox(
  organizationId: number | null
): OrgCoachingInbox {
  const { coachedProducts, isLoading: productsLoading } = useCoached()
  const asCoachQuery = useCoachingPacksAsCoach(organizationId)

  const asClient = useMemo(() => {
    if (organizationId == null) return []
    return coachedProducts.filter(
      (p) =>
        p.organization_id === organizationId && p.product_type === "coaching"
    )
  }, [coachedProducts, organizationId])

  const asCoach = asCoachQuery.data ?? []

  return {
    asClient,
    asCoach,
    isEmpty: asClient.length === 0 && asCoach.length === 0,
    isLoading:
      organizationId != null && (productsLoading || asCoachQuery.isLoading),
  }
}
