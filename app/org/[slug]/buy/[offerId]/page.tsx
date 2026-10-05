"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePublicOfferWithOrg } from "@/hooks/use-public-organization"
import { brandOnSurface, formatAmountFromCents } from "@/lib/utils"

const REDIRECT_DELAY_MS = 2500

type PageProps = {
  params: Promise<{ slug: string; offerId: string }>
}

function checkoutUrlFromPayload(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null
  if (!("url" in payload)) return null
  const url = payload.url
  return typeof url === "string" && url.length > 0 ? url : null
}

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (payload == null || typeof payload !== "object") return fallback
  if (!("error" in payload)) return fallback
  const error = payload.error
  return typeof error === "string" && error.length > 0 ? error : fallback
}

export default function BuyOfferPage({ params }: PageProps) {
  const { slug, offerId } = use(params)
  const searchParams = useSearchParams()
  const variantId = searchParams.get("variantId")

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

  const startedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading: dataLoading, error } = usePublicOfferWithOrg(
    slug,
    offerId,
    variantId
  )

  const dataError =
    !slug || !offerId
      ? "Use the link shared by your coach to access checkout."
      : error
        ? "Unable to load this offer. Please try again."
        : data === null
          ? "Offer not found."
          : null

  async function startCheckout() {
    if (startedRef.current || isStartingCheckout) return
    startedRef.current = true
    setIsStartingCheckout(true)
    setCheckoutError(null)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    try {
      const offerIdNum = Number(offerId)
      const variantNum = variantId != null && variantId !== "" ? Number(variantId) : null

      const res = await fetch("/api/stripe-connect/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offerIdNum,
          paymentLinkId:
            variantNum != null && Number.isFinite(variantNum) && variantNum > 0
              ? variantNum
              : null,
        }),
      })

      const payload: unknown = await res.json().catch(() => null)

      if (!res.ok) {
        startedRef.current = false
        setIsStartingCheckout(false)
        setCheckoutError(
          errorMessageFromPayload(payload, "Unable to start checkout. Please try again.")
        )
        return
      }

      const url = checkoutUrlFromPayload(payload)
      if (!url) {
        startedRef.current = false
        setIsStartingCheckout(false)
        setCheckoutError("Unable to start checkout. Please try again.")
        return
      }

      window.location.href = url
    } catch {
      startedRef.current = false
      setIsStartingCheckout(false)
      setCheckoutError("Unexpected error. Please try again.")
    }
  }

  useEffect(() => {
    if (dataLoading || dataError || !data || checkoutError) return
    if (startedRef.current) return

    timerRef.current = setTimeout(() => {
      void startCheckout()
    }, REDIRECT_DELAY_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once when offer is ready
  }, [dataLoading, dataError, data, checkoutError])

  const primaryColor = data?.organization.branding?.primary_color ?? "#e07b39"
  const onPrimary = brandOnSurface(primaryColor)
  const priceLabel = data
    ? formatAmountFromCents(data.offer.price, data.offer.currency)
    : null

  if (dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  if (dataError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-sm text-destructive">{dataError ?? "Offer not found."}</p>
          {slug ? (
            <Link
              href={`/org/${slug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to store
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  const { organization, offer } = data

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            CS
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            CoachStack
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {organization.name} partners with CoachStack to deliver coaching and
            program access.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Redirecting you to Stripe to purchase{" "}
            <span className="font-medium text-foreground">{offer.title}</span>
            {priceLabel ? (
              <>
                {" "}
                ({priceLabel})
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {checkoutError ? (
            <p className="text-sm text-destructive">{checkoutError}</p>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isStartingCheckout
                ? "Preparing secure checkout…"
                : "Continuing to Stripe shortly…"}
            </div>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={isStartingCheckout && !checkoutError}
            style={
              checkoutError
                ? undefined
                : { background: primaryColor, color: onPrimary.fg }
            }
            onClick={() => {
              startedRef.current = false
              void startCheckout()
            }}
          >
            {checkoutError ? "Try again" : "Continue to checkout"}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure payment powered by Stripe
          </div>
        </div>

        <Link
          href={`/org/${organization.slug}`}
          className="inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          Back to store
        </Link>
      </div>
    </div>
  )
}
