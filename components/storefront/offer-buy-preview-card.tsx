import { OfferRichDescription } from "@/components/storefront/offer-rich-description"
import { brandOnSurface } from "@/lib/utils"
import { ArrowRight, Lock } from "lucide-react"

type OfferBuyPreviewCardProps = {
  title: string
  description: string
  billingLabel: string
  priceLabel: string | null
  primaryColor: string
}

/** Buy-page style card for dashboard live preview (non-interactive). */
export function OfferBuyPreviewCard({
  title,
  description,
  billingLabel,
  priceLabel,
  primaryColor,
}: OfferBuyPreviewCardProps) {
  const onPrimary = brandOnSurface(primaryColor)

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          {billingLabel}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-neutral-950">
          {title.trim() || "Offer name"}
        </h2>
        {priceLabel ? (
          <p className="mt-1 font-display text-lg font-bold text-neutral-950">
            {priceLabel}
          </p>
        ) : null}
      </div>

      <OfferRichDescription
        description={description}
        empty="Add a description to preview it here."
      />

      <div
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
        style={{ background: primaryColor, color: onPrimary.fg }}
        aria-hidden
      >
        Continue to checkout
        <ArrowRight className="h-4 w-4 opacity-80" />
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
        <Lock className="h-3.5 w-3.5" />
        Secure payment powered by Stripe
      </p>
    </div>
  )
}
