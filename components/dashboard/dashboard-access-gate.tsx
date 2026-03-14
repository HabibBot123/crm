"use client"

import { useCoachAccessGuard } from "@/hooks/use-access-guard"

type Props = {
  children: React.ReactNode
}

/**
 * Wraps dashboard pages that require:
 * - authenticated coach user
 * - selected organization
 * - completed Stripe Connect onboarding
 *
 * For now this is global to the whole dashboard layout; if needed we can later
 * add props to make org/Stripe optional for some sections.
 */
export function DashboardAccessGate({ children }: Props) {
  const { canAccess, isLoading, guardContent } = useCoachAccessGuard({
    requireOrg: true,
    requireStripe: true,
    noOrgMessage: "Select an organization to view your dashboard.",
    stripeDescription:
      "To use the dashboard to create and sell products and offers, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter: true,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="p-4 lg:p-8">
        {guardContent}
      </div>
    )
  }

  return <>{children}</>
}


