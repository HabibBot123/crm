"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Loader2, Lock } from "lucide-react"
import { OfferRichDescription } from "@/components/storefront/offer-rich-description"
import { usePublicOfferWithOrg } from "@/hooks/use-public-organization"
import { brandOnSurface, formatAmountFromCents } from "@/lib/utils"

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

function billingLine(offer: {
  billing_type: string
  interval: "month" | "year" | null
  installment_count: number | null
}) {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Annual" : "Monthly"
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${offer.installment_count}× installments`
  }
  return "One-time"
}

function priceSuffix(offer: { interval: "month" | "year" | null }) {
  if (offer.interval === "month") return "/ mo"
  if (offer.interval === "year") return "/ yr"
  return null
}

export default function BuyOfferPage({ params }: PageProps) {
  const { slug, offerId } = use(params)
  const searchParams = useSearchParams()
  const variantId = searchParams.get("variantId")

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)

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
    if (isStartingCheckout) return
    setIsStartingCheckout(true)
    setCheckoutError(null)

    try {
      const offerIdNum = Number(offerId)
      const variantNum =
        variantId != null && variantId !== "" ? Number(variantId) : null

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
        setIsStartingCheckout(false)
        setCheckoutError(
          errorMessageFromPayload(
            payload,
            "Unable to start checkout. Please try again."
          )
        )
        return
      }

      const url = checkoutUrlFromPayload(payload)
      if (!url) {
        setIsStartingCheckout(false)
        setCheckoutError("Unable to start checkout. Please try again.")
        return
      }

      window.location.href = url
    } catch {
      setIsStartingCheckout(false)
      setCheckoutError("Unexpected error. Please try again.")
    }
  }

  const primaryColor = data?.organization.branding?.primary_color ?? "#e07b39"
  const onPrimary = brandOnSurface(primaryColor)

  if (dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  if (dataError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-sm text-red-600">{dataError ?? "Offer not found."}</p>
          {slug ? (
            <Link
              href={`/org/${slug}`}
              className="text-sm font-medium text-neutral-700 hover:text-neutral-950"
            >
              Back to store
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  const { organization, offer } = data
  const logoUrl = organization.branding?.logo_url ?? null
  const initials = organization.name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2)
  const amount = formatAmountFromCents(offer.price, offer.currency)
  const suffix = priceSuffix(offer)
  const priceLabel = amount
    ? suffix
      ? `${amount} ${suffix}`
      : amount
    : null
  return (
    <div
      className="flex min-h-screen flex-col px-5 py-10"
      style={{
        background: `radial-gradient(900px 420px at 50% -10%, ${primaryColor}22, transparent 68%), #fafafa`,
      }}
    >
      <div className="mx-auto w-full max-w-md flex-1 space-y-5">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-bold ring-1 ring-black/5"
            style={{ color: primaryColor }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <p className="font-display text-lg font-bold tracking-tight text-neutral-950">
            {organization.name}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Partners with{" "}
            <span className="font-medium text-neutral-700">CoachStack</span> for
            delivery
          </p>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {billingLine(offer)}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-neutral-950">
              {offer.title}
            </h1>
            {priceLabel ? (
              <p className="mt-1 font-display text-lg font-bold text-neutral-950">
                {priceLabel}
              </p>
            ) : null}
          </div>

          <OfferRichDescription description={offer.description} />

          {checkoutError ? (
            <p className="text-sm text-red-600">{checkoutError}</p>
          ) : null}

          <button
            type="button"
            disabled={isStartingCheckout}
            onClick={() => {
              void startCheckout()
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:brightness-105 active:scale-[0.985] disabled:opacity-70"
            style={{ background: primaryColor, color: onPrimary.fg }}
          >
            {isStartingCheckout ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing checkout…
              </>
            ) : (
              <>
                {checkoutError ? "Try again" : "Continue to checkout"}
                <ArrowRight className="h-4 w-4 opacity-80" />
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
            <Lock className="h-3.5 w-3.5" />
            Secure payment powered by Stripe
          </p>
        </div>

        <div className="text-center">
          <Link
            href={`/org/${organization.slug}`}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Back to store
          </Link>
        </div>
      </div>

      <p className="mx-auto mt-10 w-full max-w-md shrink-0 text-center text-[11px] text-neutral-400">
        Powered by{" "}
        <a
          href="https://coachstack.co"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-500 transition-colors hover:text-neutral-700"
        >
          CoachStack
        </a>
      </p>

    </div>
  )
}
