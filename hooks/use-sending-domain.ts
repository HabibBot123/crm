"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchSendingDomain } from "@/lib/services/sending-domains"
import {
  organizationSendingDomainSchema,
  type CreateSendingDomainInput,
  type OrganizationSendingDomain,
} from "@/schemas/sending-domain.schema"

type SendingDomainResponse = {
  domain: OrganizationSendingDomain | null
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error
  }
  return fallback
}

async function parseResponse(res: Response): Promise<SendingDomainResponse> {
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(readErrorMessage(body, "Request failed"))
  }
  if (!body || typeof body !== "object" || !("domain" in body)) {
    throw new Error("Invalid response")
  }
  if (body.domain === null) {
    return { domain: null }
  }
  const domain = organizationSendingDomainSchema.parse(body.domain)
  return { domain }
}

export function useSendingDomain(organizationId: number | null) {
  const { supabase } = useAuth()
  const query = useQuery({
    queryKey: ["sending-domain", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("organizationId is required")
      return fetchSendingDomain(supabase, organizationId)
    },
    enabled: !!organizationId,
  })

  return {
    domain: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCreateSendingDomain(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSendingDomainInput) => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(`/api/organizations/${organizationId}/sending-domain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const data = await parseResponse(res)
      return data.domain
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sending-domain", organizationId] })
    },
  })
}

export function useVerifySendingDomain(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(
        `/api/organizations/${organizationId}/sending-domain/verify`,
        { method: "POST" }
      )
      const data = await parseResponse(res)
      return data.domain
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sending-domain", organizationId] })
    },
  })
}

export function useRefreshSendingDomain(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(`/api/organizations/${organizationId}/sending-domain`, {
        method: "PATCH",
      })
      const data = await parseResponse(res)
      return data.domain
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sending-domain", organizationId] })
    },
  })
}

export function useDeleteSendingDomain(organizationId: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("organizationId is required")
      const res = await fetch(`/api/organizations/${organizationId}/sending-domain`, {
        method: "DELETE",
      })
      await parseResponse(res)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sending-domain", organizationId] })
    },
  })
}
