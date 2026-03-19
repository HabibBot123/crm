"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchClientsPage,
  fetchClientDetail,
  type ClientsPage,
  type ClientSummary,
  type ClientWithEnrollments,
} from "@/lib/services/clients"

export type UseClientsParams = {
  organizationId: number | null
  page: number
  pageSize: number
  search: string
}

export function useClients(params: UseClientsParams) {
  const { organizationId, page, pageSize, search } = params

  const query = useQuery({
    queryKey: ["clients", organizationId, page, pageSize, search],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("organizationId is required to fetch clients")
      }
      return fetchClientsPage({
        organizationId,
        page,
        pageSize,
        search: search.trim() || undefined,
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
  const { organizationId, clientKey } = params

  const query = useQuery({
    queryKey: ["client-detail", organizationId, clientKey],
    queryFn: () => {
      if (!organizationId || !clientKey) {
        throw new Error("organizationId and clientKey are required")
      }
      return fetchClientDetail({ organizationId, clientKey })
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
