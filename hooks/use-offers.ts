"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createOffer,
  createOfferVariant,
  deleteOfferVariant,
  fetchOfferWithDetails,
  fetchOffersByOrganization,
  fetchOffersPage,
  type OfferFetchScope,
  updateOffer,
  type OfferListItem,
  type OfferWithDetails,
} from "@/lib/services/offers"

export function offersQueryKey(
  organizationId: number | null,
  scope: OfferFetchScope = "all"
) {
  return ["offers", organizationId, scope] as const
}

export function offersPageQueryKey(
  organizationId: number | null,
  scope: OfferFetchScope,
  page: number,
  pageSize: number
) {
  return ["offers", organizationId, scope, "page", page, pageSize] as const
}

function invalidateOffersForOrganization(
  queryClient: QueryClient,
  organizationId: number | null
) {
  if (organizationId == null) return
  void queryClient.invalidateQueries({ queryKey: ["offers", organizationId] })
}

export function offerQueryKey(offerId: number) {
  return ["offer", offerId] as const
}

export function useOffers(
  organizationId: number | null,
  scope: OfferFetchScope = "all"
) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: offersQueryKey(organizationId, scope),
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required to fetch offers")
      return fetchOffersByOrganization(supabase, organizationId, scope)
    },
    enabled: !!organizationId,
  })

  return {
    offers: (query.data ?? []) as OfferListItem[],
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useOffersPage(
  organizationId: number | null,
  scope: OfferFetchScope,
  page: number,
  pageSize: number
) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: offersPageQueryKey(organizationId, scope, page, pageSize),
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required to fetch offers")
      return fetchOffersPage(supabase, organizationId, scope, page, pageSize)
    },
    enabled: !!organizationId,
  })

  const data = query.data ?? { items: [] as OfferListItem[], total: 0 }

  return {
    items: data.items,
    total: data.total,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useOffer(offerId: number, enabled: boolean) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: offerQueryKey(offerId),
    queryFn: () => fetchOfferWithDetails(supabase, offerId),
    enabled,
  })

  return {
    offer: (query.data ?? null) as OfferWithDetails | null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useArchiveOffer(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (offerId: number) => updateOffer(supabase, offerId, { status: "archived" }),
    onSuccess: () => {
      invalidateOffersForOrganization(queryClient, organizationId)
      toast.success("Offer archived")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateOffer(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof createOffer>[1]) => createOffer(supabase, input),
    onSuccess: () => {
      invalidateOffersForOrganization(queryClient, organizationId)
      toast.success("Offer created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateOffer(organizationId: number | null, offerId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateOffer>[2]) => updateOffer(supabase, offerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerQueryKey(offerId) })
      invalidateOffersForOrganization(queryClient, organizationId)
      toast.success("Offer updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddOfferVariant(offerId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof createOfferVariant>[2]) =>
      createOfferVariant(supabase, offerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerQueryKey(offerId) })
      toast.success("Variant added")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteOfferVariant(offerId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variantId: number) => deleteOfferVariant(supabase, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerQueryKey(offerId) })
      toast.success("Variant deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function usePublishOffer(organizationId: number | null, offerId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("organizationId is required to publish an offer")
      const res = await fetch("/api/stripe-connect/create-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, offerId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to publish offer"
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerQueryKey(offerId) })
      invalidateOffersForOrganization(queryClient, organizationId)
      toast.success("Offer published")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useGenerateOfferVariantPrice(offerId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { organizationId: number; paymentLinkId: number }) => {
      const res = await fetch("/api/stripe-connect/create-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: input.organizationId,
          offerId,
          paymentLinkId: input.paymentLinkId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message =
          data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to generate Stripe price"
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerQueryKey(offerId) })
      toast.success("Stripe price generated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

