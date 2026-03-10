"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { Button } from "@/components/ui/button"

export type UseStripeConnectGuardOptions = {
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
 * Guard for pages that require an organization and completed Stripe Connect onboarding
 * (e.g. products, offers). Use when the page should be blocked until both are satisfied.
 */
export function useStripeConnectGuard(options: UseStripeConnectGuardOptions = {}) {
  const router = useRouter()
  const { currentOrganization, isLoading } = useCurrentOrganization()
  const {
    noOrgMessage = "Select an organization to continue.",
    stripeTitle = "Stripe Connect required",
    stripeDescription =
      "To create and sell products and offers, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter = false,
  } = options

  const canAccess =
    !!currentOrganization?.id && currentOrganization.stripe_onboarding_completed === true

  const guardContent: React.ReactNode | null =
    !currentOrganization && !isLoading ? (
      <p className="text-sm text-muted-foreground">{noOrgMessage}</p>
    ) : currentOrganization && !currentOrganization.stripe_onboarding_completed ? (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">{stripeTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{stripeDescription}</p>
        {stripeUseRouter ? (
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
        )}
      </div>
    ) : null

  return {
    canAccess,
    isLoading,
    guardContent,
    currentOrganization,
  }
}
