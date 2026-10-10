"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchClientsPage,
  fetchClientDetail,
  type ClientsPage,
  type ClientSummary,
  type ClientWithEnrollments,
} from "@/lib/services/clients"
import { lookupBuyerForManualEnrollment } from "@/lib/services/enrollments"
import type { ManualEnrollmentBuyerLookup } from "@/schemas/enrollments.schema"

export type CreateManualEnrollmentVariables = {
  organizationId: number
  offerId: number
  buyerEmail: string
  buyerName?: string
  priceCents: number
  /** null = lifetime */
  accessDurationMonths: number | null
  /** Business sale date YYYY-MM-DD */
  soldAt: string
}

export function useManualEnrollmentBuyerLookup(
  organizationId: number | null,
  email: string,
  enabled: boolean
) {
  const { supabase } = useAuth()
  const [debouncedEmail, setDebouncedEmail] = useState(email)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedEmail(email.trim().toLowerCase())
    }, 400)
    return () => window.clearTimeout(handle)
  }, [email])

  const canLookup =
    enabled &&
    !!supabase &&
    organizationId != null &&
    debouncedEmail.includes("@") &&
    debouncedEmail.includes(".")

  const query = useQuery({
    queryKey: ["manual-enrollment-buyer", organizationId, debouncedEmail],
    queryFn: async (): Promise<ManualEnrollmentBuyerLookup> => {
      if (!supabase || organizationId == null) {
        throw new Error("organizationId and supabase are required")
      }
      return lookupBuyerForManualEnrollment(supabase, organizationId, debouncedEmail)
    },
    enabled: canLookup,
  })

  return {
    data: query.data ?? null,
    isFetching: query.isFetching,
    isError: query.isError,
    debouncedEmail,
  }
}

export function useCreateManualEnrollment(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: CreateManualEnrollmentVariables) => {
      const res = await fetch(
        `/api/organizations/${variables.organizationId}/enrollments/manual`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId: variables.offerId,
            buyerEmail: variables.buyerEmail,
            buyerName: variables.buyerName || null,
            priceCents: variables.priceCents,
            accessDurationMonths: variables.accessDurationMonths,
            soldAt: variables.soldAt,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const message =
          body && typeof body.error === "string"
            ? body.error
            : "Failed to create enrollment"
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      if (organizationId != null) {
        void queryClient.invalidateQueries({ queryKey: ["clients", organizationId] })
        void queryClient.invalidateQueries({ queryKey: ["client-detail", organizationId] })
        void queryClient.invalidateQueries({ queryKey: ["coaching-packs", organizationId] })
      }
      toast.success("Enrollment created")
    },
    onError: (e) => {
      toast.error(e.message)
    },
  })
}

export type UseClientsParams = {
  organizationId: number | null
  page: number
  pageSize: number
  search: string
  statuses?: Array<"active" | "expired">
  totalSpentMinCents?: number
  totalSpentMaxCents?: number
  firstJoinedFrom?: string
  firstJoinedTo?: string
}

export function useClients(params: UseClientsParams) {
  const { supabase } = useAuth()
  const {
    organizationId,
    page,
    pageSize,
    search,
    statuses,
    totalSpentMinCents,
    totalSpentMaxCents,
    firstJoinedFrom,
    firstJoinedTo,
  } = params

  const query = useQuery({
    queryKey: [
      "clients",
      organizationId,
      page,
      pageSize,
      search,
      statuses ?? [],
      totalSpentMinCents ?? null,
      totalSpentMaxCents ?? null,
      firstJoinedFrom ?? null,
      firstJoinedTo ?? null,
    ],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("organizationId is required to fetch clients")
      }
      return fetchClientsPage({
        supabase,
        organizationId,
        page,
        pageSize,
        search: search.trim() || undefined,
        statuses,
        totalSpentMinCents,
        totalSpentMaxCents,
        firstJoinedFrom,
        firstJoinedTo,
      })
    },
    enabled: !!organizationId,
  })

  return {
    data: (query.data ?? { items: [], total: 0 }) as ClientsPage,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type UseClientDetailParams = {
  organizationId: number | null
  clientKey: string | null
}

export function useClientDetail(params: UseClientDetailParams) {
  const { supabase } = useAuth()
  const { organizationId, clientKey } = params

  const query = useQuery({
    queryKey: ["client-detail", organizationId, clientKey],
    queryFn: () => {
      if (!organizationId || !clientKey) {
        throw new Error("organizationId and clientKey are required")
      }
      return fetchClientDetail({ supabase, organizationId, clientKey })
    },
    enabled: !!organizationId && !!clientKey,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export type { ClientSummary, ClientWithEnrollments }
