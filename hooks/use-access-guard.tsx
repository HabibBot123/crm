"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { Button } from "@/components/ui/button"

// ----------------------------
// Coached side (students)
// ----------------------------

export function useCoachedAccessGuard() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()

  const fallbackNext = "/coached"
  const next = pathname && pathname !== "/" ? pathname : fallbackNext

  useEffect(() => {
    if (!authLoading && !user) {
      const target = `/coached-login?next=${encodeURIComponent(next)}`
      router.replace(target)
    }
  }, [authLoading, user, next, router])

  const canAccess = !authLoading && !!user

  return {
    canAccess,
    isLoading: authLoading || (!authLoading && !user),
  }
}

// ----------------------------
// Coach side (dashboard)
// ----------------------------

export type UseCoachAccessGuardOptions = {
  /** If true, requires an organization to be selected. */
  requireOrg?: boolean
  /** If true, requires Stripe Connect onboarding to be completed. */
  requireStripe?: boolean
  /** Shown when no organization is selected. Default: "Select an organization to continue." */
  noOrgMessage?: string
  /** Card title when Stripe is required. Default: "Stripe Connect required" */
  stripeTitle?: string
  /** Card description when Stripe is required. Default: generic message for products/offers */
  stripeDescription?: string
  /** If true, Stripe CTA uses router.push instead of Link (e.g. for in-page flow). Default: false */
  stripeUseRouter?: boolean
}

/**
 * Coach dashboard guard:
 * - Redirects to coach login if not authenticated
 * - Optionally enforces selected organization + Stripe Connect
 */
export function useCoachAccessGuard(options: UseCoachAccessGuardOptions = {}) {
  const {
    requireOrg = false,
    requireStripe = false,
    noOrgMessage = "Select an organization to continue.",
    stripeTitle = "Stripe Connect required",
    stripeDescription =
      "To create and sell products and offers, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter = false,
  } = options

  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const { currentOrganization, organizations, isLoading: orgLoading } = useCurrentOrganization()

  const fallbackNext = "/dashboard"
  const next = pathname && pathname !== "/" ? pathname : fallbackNext

  // Redirect to coach login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const target = `/login?next=${encodeURIComponent(next)}`
      router.replace(target)
    }
  }, [authLoading, user, next, router])

  // While auth/org status is loading or redirect in progress, block access
  if (authLoading || (!authLoading && !user) || orgLoading) {
    return {
      canAccess: false,
      isLoading: true,
      guardContent: null as React.ReactNode,
      currentOrganization: currentOrganization ?? null,
    }
  }

  // 2) Org / Stripe requirements
  if (requireOrg && !currentOrganization) {
    const hasNoOrgs = organizations.length === 0
    const guardContent = hasNoOrgs ? (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">
          No organization associated
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account is not associated with any organization. Would you like to create one or go back to the coached area?
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/create-organization">Create an organization</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/coached">Go to coached area</Link>
          </Button>
        </div>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">{noOrgMessage}</p>
    )
    return {
      canAccess: false,
      isLoading: false,
      guardContent,
      currentOrganization: null,
    }
  }

  if (
    requireStripe &&
    currentOrganization &&
    currentOrganization.stripe_onboarding_completed !== true
  ) {
    const stripeCta = stripeUseRouter ? (
      <Button
        className="mt-4"
        onClick={() => router.push("/dashboard/stripe-connect")}
      >
        Configure Stripe Connect
      </Button>
    ) : (
      <Button className="mt-4" asChild>
        <Link href="/dashboard/stripe-connect">Configure Stripe Connect</Link>
      </Button>
    )

    return {
      canAccess: false,
      isLoading: false,
      guardContent: (
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold text-foreground">{stripeTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{stripeDescription}</p>
          {stripeCta}
        </div>
      ),
      currentOrganization,
    }
  }

  // 3) Everything satisfied
  return {
    canAccess: true,
    isLoading: false,
    guardContent: null as React.ReactNode,
    currentOrganization: currentOrganization ?? null,
  }
}


