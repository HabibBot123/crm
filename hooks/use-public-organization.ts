"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchPublicOrganizationBySlug,
  getPublicOfferWithOrg,
  type PublicOrgResponse,
  type PublicOfferWithOrgResponse,
} from "@/lib/services/organizations"

export function usePublicOrganization(slug: string | null) {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const query = useQuery<PublicOrgResponse | null>({
    queryKey: ["public-org", slug],
    enabled: !!slug,
    queryFn: async () => {
      if (!slug) return null
      return fetchPublicOrganizationBySlug(baseUrl, slug)
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Public buy flow: single offer + organization (same API as `/org/[slug]/buy/[offerId]`).
 */
export function usePublicOfferWithOrg(
  slug: string | null,
  offerIdParam: string | null,
  variantIdParam: string | null
) {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const offerIdNum =
    offerIdParam != null && offerIdParam !== "" ? Number(offerIdParam) : Number.NaN
  const variantNum =
    variantIdParam != null && variantIdParam !== "" ? Number(variantIdParam) : Number.NaN
  const variantId =
    Number.isFinite(variantNum) && variantNum > 0 ? variantNum : null

  const query = useQuery<PublicOfferWithOrgResponse | null>({
    queryKey: ["public-offer", slug, offerIdParam, variantIdParam],
    enabled: !!slug && Number.isFinite(offerIdNum) && offerIdNum > 0,
    queryFn: async () => {
      if (!slug || !Number.isFinite(offerIdNum) || offerIdNum <= 0) return null
      return getPublicOfferWithOrg(baseUrl, slug, offerIdNum, variantId)
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export type { PublicOrgResponse, PublicOfferWithOrgResponse }
