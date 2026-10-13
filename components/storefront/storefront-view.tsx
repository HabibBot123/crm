import type { CSSProperties } from "react"
import {
  bioLooksLikeHtml,
  sanitizeBioHtml,
} from "@/lib/branding/sanitize-bio-html"
import { brandOnSurface, cn, formatAmountFromCents } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export type StorefrontOffer = {
  id: number
  title: string
  description: string | null
  price: number
  currency: string
  interval: "month" | "year" | null
  installment_count: number | null
  billing_type: "subscription" | "one_time" | "installment"
  key_features: string[] | null
}

type StorefrontCssVars = CSSProperties & {
  "--store-primary": string
  "--store-on-primary": string
}

export type StorefrontViewProps = {
  name: string
  logoUrl: string | null
  bio: string
  primaryColor: string
  offers: StorefrontOffer[]
  /** Prefix for buy links, e.g. `/org/acme/buy` → `/org/acme/buy/{offerId}`. */
  buyHrefBase: string
  /** Optional banner above the store (e.g. preview mode). */
  banner?: string | null
  /** Compact mode for dashboard live preview. */
  embedded?: boolean
  /** Disable offer navigation (editor preview). */
  disableOfferLinks?: boolean
}

function billingLine(offer: StorefrontOffer) {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Annual" : "Monthly"
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${offer.installment_count}× installments`
  }
  return "One-time"
}

function priceSuffix(offer: StorefrontOffer): string | null {
  if (offer.interval === "month") return "/ mo"
  if (offer.interval === "year") return "/ yr"
  return null
}

function offerPriceLabel(offer: StorefrontOffer): string | null {
  const amount = formatAmountFromCents(offer.price, offer.currency)
  if (!amount) return null
  const suffix = priceSuffix(offer)
  return suffix ? `${amount} ${suffix}` : amount
}

function StorefrontBio({ bio }: { bio: string }) {
  const trimmed = bio.trim()
  if (!trimmed) return null

  if (bioLooksLikeHtml(trimmed)) {
    const html = sanitizeBioHtml(trimmed)
    if (!html) return null
    return (
      <div
        className="storefront-bio mx-auto mt-3 w-full max-w-md text-[15px] leading-relaxed text-neutral-600"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-neutral-600 whitespace-pre-line">
      {trimmed}
    </p>
  )
}

export function StorefrontView({
  name,
  logoUrl,
  bio,
  primaryColor,
  offers,
  buyHrefBase,
  banner = null,
  embedded = false,
  disableOfferLinks = false,
}: StorefrontViewProps) {
  const onPrimary = brandOnSurface(primaryColor)
  const initials = name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2)
  const buyBase = buyHrefBase.replace(/\/$/, "")
  const hasOffers = offers.length > 0
  const splitLayout = hasOffers && !embedded

  const rootStyle: StorefrontCssVars = {
    "--store-primary": primaryColor,
    "--store-on-primary": onPrimary.fg,
  }

  return (
    <div
      className={cn(
        "storefront relative overflow-hidden",
        embedded ? "min-h-0" : "min-h-screen"
      )}
      style={rootStyle}
    >
      <div aria-hidden className="storefront-atmosphere pointer-events-none absolute inset-0" />
      <div aria-hidden className="storefront-grain pointer-events-none absolute inset-0" />

      <main
        className={cn(
          "relative mx-auto flex w-full flex-col px-5 sm:px-6",
          splitLayout ? "max-w-5xl" : "max-w-md",
          embedded
            ? "min-h-0 pb-6 pt-8"
            : "min-h-screen pb-8 pt-10 sm:pt-14"
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col",
            !embedded && "justify-center"
          )}
        >
          {banner ? (
            <p className="storefront-fade mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {banner}
            </p>
          ) : null}

          <div
            className={cn(
              "grid gap-10",
              splitLayout
                ? "items-center lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14"
                : "grid-cols-1"
            )}
          >
            <header className="storefront-fade flex flex-col items-center text-center">
              <div
                className="mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] bg-white/70 text-2xl font-bold shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-black/5 backdrop-blur-sm"
                style={{
                  boxShadow: `0 0 0 6px ${primaryColor}18, 0 18px 40px -28px ${primaryColor}80`,
                }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span style={{ color: primaryColor }}>{initials}</span>
                )}
              </div>

              <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-neutral-950 sm:text-[2.35rem]">
                {name}
              </h1>

              <StorefrontBio bio={bio} />

              {!hasOffers ? (
                <p className="mt-6 text-sm text-neutral-500">
                  No offers available yet.
                </p>
              ) : null}
            </header>

            {hasOffers ? (
              <section id="offers" className="w-full space-y-2.5">
                {offers.map((offer, index) => {
                  const priceLabel = offerPriceLabel(offer)
                  const delayMs = 80 + index * 60

                  const className =
                    "storefront-offer group flex items-center gap-3 rounded-2xl px-4 py-4 transition duration-200 hover:brightness-105 active:scale-[0.985] sm:px-5"
                  const style = {
                    animationDelay: `${delayMs}ms`,
                    background: primaryColor,
                    color: onPrimary.fg,
                  }
                  const body = (
                    <>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-display text-[17px] font-semibold leading-snug tracking-tight">
                          {offer.title}
                        </p>
                        <p
                          className="mt-1 text-[13px] font-medium"
                          style={{ color: onPrimary.muted }}
                        >
                          {[priceLabel, billingLine(offer)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </>
                  )

                  if (disableOfferLinks) {
                    return (
                      <div key={offer.id} className={className} style={style}>
                        {body}
                      </div>
                    )
                  }

                  return (
                    <a
                      key={offer.id}
                      href={`${buyBase}/${offer.id}`}
                      className={className}
                      style={style}
                    >
                      {body}
                    </a>
                  )
                })}
              </section>
            ) : null}
          </div>
        </div>

        <p className="storefront-fade mt-10 shrink-0 text-center text-[11px] text-neutral-400">
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
      </main>

      <style>{`
        .storefront {
          color-scheme: light;
          background:
            radial-gradient(1100px 480px at 50% -12%, color-mix(in srgb, var(--store-primary) 22%, transparent), transparent 68%),
            radial-gradient(640px 380px at 100% 18%, color-mix(in srgb, var(--store-primary) 10%, transparent), transparent 58%),
            linear-gradient(180deg, #fafafa 0%, #f4f4f5 45%, #fafafa 100%);
        }
        .storefront-atmosphere {
          background:
            radial-gradient(ellipse 80% 48% at 50% 0%, color-mix(in srgb, var(--store-primary) 14%, transparent), transparent 70%);
        }
        .storefront-grain {
          opacity: 0.035;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .storefront-bio p { margin: 0; }
        .storefront-bio p + p { margin-top: 0.55rem; }
        .storefront-bio ul,
        .storefront-bio ol {
          margin: 0.55rem auto 0;
          padding-left: 1.15rem;
          text-align: left;
          width: fit-content;
          max-width: 100%;
        }
        .storefront-bio a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
        .storefront-bio strong { color: #0a0a0a; font-weight: 650; }
        .storefront-fade {
          animation: storefront-rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .storefront-offer {
          animation: storefront-rise 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes storefront-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .storefront-fade,
          .storefront-offer {
            animation: none;
          }
          .storefront-offer:active {
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
