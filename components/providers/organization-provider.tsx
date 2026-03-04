"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { OrganizationDisplay } from "@/lib/services/organizations"
import { useOrganizations } from "@/hooks/use-organizations"

const STORAGE_KEY = "crm-sport-current-org-id"

type OrganizationContextType = {
  currentOrganization: OrganizationDisplay | null
  setCurrentOrganizationId: (id: number) => void
  organizations: OrganizationDisplay[]
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
