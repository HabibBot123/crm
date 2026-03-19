"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createOffer,
  createOfferVariant,
  deleteOfferVariant,
  fetchOfferWithDetails,
  fetchOffersByOrganization,
  updateOffer,
  type OfferListItem,
  type OfferWithDetails,
} from "@/lib/services/offers"

export function offersQueryKey(organizationId: number | null) {
  return ["offers", organizationId] as const
}

export function offerQueryKey(offerId: number) {
  return ["offer", offerId] as const
}

export function useOffers(organizationId: number | null) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: offersQueryKey(organizationId),
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required to fetch offers")
      return fetchOffersByOrganization(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    offers: (query.data ?? []) as OfferListItem[],
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
      queryClient.invalidateQueries({ queryKey: offersQueryKey(organizationId) })
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
      queryClient.invalidateQueries({ queryKey: offersQueryKey(organizationId) })
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
      queryClient.invalidateQueries({ queryKey: offersQueryKey(organizationId) })
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
      queryClient.invalidateQueries({ queryKey: offersQueryKey(organizationId) })
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

