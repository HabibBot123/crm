"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { Organization } from "@/lib/services/organizations"
import { useOrganizations } from "@/hooks/use-organizations"

const STORAGE_KEY = "crm-sport-current-org-id"

type OrganizationContextType = {
  currentOrganization: Organization | null
  setCurrentOrganizationId: (id: number) => void
  organizations: Organization[]
  isLoading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { organizations, isLoading } = useOrganizations()
  const [currentId, setCurrentId] = useState<number | null>(null)

  const currentOrganization = useMemo(
    () => organizations.find((o) => o.id === currentId) ?? null,
    [organizations, currentId]
  )

  useEffect(() => {
    if (isLoading || organizations.length === 0) return
    let queryId: number | null = null
    if (typeof window !== "undefined") {
      const search = window.location.search
      if (search) {
        const params = new URLSearchParams(search)
        const raw = params.get("orgId")
        const parsedQuery = raw ? Number(raw) : NaN
        const validQuery =
          Number.isFinite(parsedQuery) && organizations.some((o) => o.id === parsedQuery)
        if (validQuery) {
          queryId = parsedQuery
          setCurrentId(parsedQuery)
          localStorage.setItem(STORAGE_KEY, String(parsedQuery))
          const url = new URL(window.location.href)
          url.searchParams.delete("orgId")
          window.history.replaceState({}, "", url.toString())
          return
        }
      }
    }

    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    const parsed = stored ? Number(stored) : NaN
    const validId = Number.isFinite(parsed) && organizations.some((o) => o.id === parsed)
    if (validId) {
      setCurrentId(parsed)
    } else {
      const first = organizations[0]
      if (first) {
        setCurrentId(first.id)
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, String(first.id))
        }
      }
    }
  }, [isLoading, organizations])

  const setCurrentOrganizationId = useCallback((id: number) => {
    setCurrentId(id)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(id))
    }
  }, [])

  const value: OrganizationContextType = useMemo(
    () => ({
      currentOrganization,
      setCurrentOrganizationId,
      organizations,
      isLoading,
    }),
    [currentOrganization, setCurrentOrganizationId, organizations, isLoading]
  )

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useCurrentOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error("useCurrentOrganization must be used within an OrganizationProvider")
  }
  return context
}
