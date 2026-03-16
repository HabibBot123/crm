"use client"

import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCoachedProducts,
  coachedOrgsFromProducts,
  type CoachedOrg,
  type CoachedProduct,
} from "@/lib/services/coached"

/** App-wide coached context: orgs (my coaches) and products list for home/shell. */
export function useCoached() {
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null

  const query = useQuery({
    queryKey: ["coached", userId],
    queryFn: () => {
      if (!userId) throw new Error("Cannot fetch coached products without a user id")
      return fetchCoachedProducts(supabase, userId)
    },
    enabled: !!userId,
  })

  const products = (query.data ?? []) as CoachedProduct[]
  const orgs = coachedOrgsFromProducts(products)

  return {
    coachedOrgs: orgs,
    coachedProducts: products,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export type { CoachedOrg, CoachedProduct }
