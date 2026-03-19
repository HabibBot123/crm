"use client"

import { useCoachAccessGuard } from "@/hooks/use-access-guard"

type Props = {
  children: React.ReactNode
}

/**
 * Wraps dashboard pages that require:
 * - authenticated coach user
 * - selected organization
 *
 * Stripe Connect onboarding is enforced only on specific pages
 * (e.g. products, offers) that explicitly opt in via `useCoachAccessGuard`.
 *
 * This gate is applied globally in the dashboard layout.
 */
export function DashboardAccessGate({ children }: Props) {
  const { canAccess, isLoading, guardContent } = useCoachAccessGuard({
    requireOrg: true,
    requireStripe: false,
    noOrgMessage: "Select an organization to view your dashboard.",
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


