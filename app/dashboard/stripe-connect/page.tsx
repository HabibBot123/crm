"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { Button } from "@/components/ui/button"
import { Loader2, Info } from "lucide-react"

type StripeStatusResponse = {
  stripeAccountId: string | null
  payoutsEnabled: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  onboardingCompleted: boolean
}

export default function StripeConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrganization, isLoading } = useCurrentOrganization()

  const [status, setStatus] = useState<StripeStatusResponse | null>(null)
  const [isFetchingStatus, setIsFetchingStatus] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgTimeout, setOrgTimeout] = useState(false)

  const success = searchParams.get("success")
  const refresh = searchParams.get("refresh")

  useEffect(() => {
    if (isLoading || !currentOrganization) return

    const fetchStatus = async () => {
      setIsFetchingStatus(true)
      setError(null)
      try {
        const res = await fetch("/api/stripe-connect/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: currentOrganization.id }),
        })

        const data = (await res.json()) as StripeStatusResponse & { error?: string }

        if (!res.ok) {
          setError(data.error ?? "Unable to fetch Stripe account status.")
          setStatus(null)
          return
        }

        setStatus(data)

        // Si l'onboarding est terminé, on peut rediriger vers la page produits plus tard
      } catch (err) {
        console.error(err)
        setError("Unexpected error while fetching Stripe account status.")
        setStatus(null)
      } finally {
        setIsFetchingStatus(false)
      }
    }

    void fetchStatus()
  }, [isLoading, currentOrganization, router])

  // Handle UX when organization data is not yet available
  useEffect(() => {
    if (currentOrganization) {
      setOrgTimeout(false)
      return
    }

    const timer = setTimeout(() => {
      if (!currentOrganization) {
        setOrgTimeout(true)
      }
    }, 30000)

    return () => clearTimeout(timer)
  }, [currentOrganization])

  const handleStartOnboarding = async () => {
    if (!currentOrganization || isProcessingAction) return
    setIsProcessingAction(true)
    setError(null)
    try {
      const res = await fetch("/api/stripe-connect/oauth-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrganization.id }),
      })

      const data = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || !data.url) {
        setError(data.error ?? "Unable to start Stripe connection. Please try again or contact support.")
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error(err)
      setError("Unexpected error while creating the onboarding link.")
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleGoToProducts = () => {
    router.push("/dashboard/content")
  }

  const onboardingCompleted = status?.onboardingCompleted ?? false

  if (!currentOrganization) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          {!orgTimeout ? (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
              <h1 className="mt-4 text-base font-semibold text-foreground">
                We are getting the information about your organization
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This usually takes just a moment. If it takes too long, you can switch organization
                or refresh the page.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-base font-semibold text-foreground">
                We couldn&apos;t retrieve your organization data
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please try refreshing the page or selecting a different organization. If the problem
                persists, contact support.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Stripe Connect configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account so you can sell your offers and collect payments.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Current organization:{" "}
          <span className="font-medium text-foreground">
            {currentOrganization.name}
          </span>
        </p>

        {success && (
          <p className="text-xs text-emerald-600">
            Returned from Stripe. Checking your account status…
          </p>
        )}
        {refresh && (
          <p className="text-xs text-amber-600">
            The previous link has expired. Generate a new link to resume onboarding.
          </p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* In Standard mode, Stripe handles business type selection during their own onboarding flow. */}

        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">
            Status of your Stripe Connect account
          </p>
          {isFetchingStatus && <p className="text-muted-foreground">Loading…</p>}
          {!isFetchingStatus && status && (
            <div className="space-y-2 text-muted-foreground">
              <ul className="space-y-1">
                <li>
                  Stripe account:{" "}
                  {status.stripeAccountId ? (
                    <span className="font-mono text-xs">{status.stripeAccountId}</span>
                  ) : (
                    <span>Not created yet</span>
                  )}
                </li>
                <li>
                  Payments (charges):{" "}
                  <span className={status.chargesEnabled ? "text-emerald-600" : "text-amber-600"}>
                    {status.chargesEnabled ? "enabled" : "pending"}
                  </span>
                </li>
                <li>
                  Payouts:{" "}
                  <span className={status.payoutsEnabled ? "text-emerald-600" : "text-amber-600"}>
                    {status.payoutsEnabled ? "enabled" : "pending"}
                  </span>
                </li>
                <li>
                  Details submitted:{" "}
                  <span className={status.detailsSubmitted ? "text-emerald-600" : "text-amber-600"}>
                    {status.detailsSubmitted ? "OK" : "incomplete"}
                  </span>
                </li>
              </ul>

              {!status.stripeAccountId && (
                <div className="mt-3 rounded-md border border-dashed border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                  You haven&apos;t created a Stripe Connect account for this organization yet.
                  Click the button below to create it and start the onboarding flow.
                </div>
              )}

              {status.stripeAccountId && !onboardingCompleted && (
                <div className="mt-3 rounded-md border border-dashed border-amber-400/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
                  Your Stripe account exists, but onboarding isn&apos;t completed yet. Continue the
                  onboarding flow to enable payments and payouts.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {!onboardingCompleted && (
            <Button
              onClick={handleStartOnboarding}
              disabled={isProcessingAction || isFetchingStatus || isLoading}
            >
              {isProcessingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {status?.stripeAccountId
                    ? "Preparing Stripe onboarding…"
                    : "Creating Stripe account…"}
                </>
              ) : status?.stripeAccountId ? (
                "Continue Stripe onboarding"
              ) : (
                "Create Stripe account"
              )}
            </Button>
          )}

          {onboardingCompleted && (
            <Button variant="default" onClick={handleGoToProducts}>
              Go to my offers / products
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="sm:ml-auto"
          >
            Back to dashboard
          </Button>
        </div>

        <div className="mt-3 flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p>
              We use <span className="font-medium text-foreground">Stripe</span> as our payments
              partner. <span className="font-medium text-foreground">Stripe Connect</span> lets you
              receive payments on your own Stripe account while selling via CRM Sport.
            </p>
            <p className="mt-1">
              Setup can take several steps; after each visit to Stripe, we refresh your status and
              let you know if anything else is needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

