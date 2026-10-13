"use client"

import { useState, type FormEvent } from "react"
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react"
import { OfferCopyButton } from "@/components/dashboard/offers/offer-copy-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OFFER_CURRENCIES } from "@/lib/constants/offers"
import type {
  OfferVariant,
  OfferWithDetails,
  UpdateOfferInput,
} from "@/lib/services/offers"
import { buildOrgUrl, cn, formatAmountFromCents } from "@/lib/utils"
import { toast } from "sonner"

function parseBillingInterval(value: string): "month" | "year" | null {
  if (value === "month" || value === "year") return value
  return null
}

type OfferPricingPanelProps = {
  offer: OfferWithDetails
  orgSlug?: string
  onSavePricing: (input: UpdateOfferInput) => void
  savePending: boolean
  onAddVariant: (input: {
    label?: string | null
    price?: number | null
    installment_count?: number | null
  }) => void
  onDeleteVariant: (variantId: number) => void
  onGeneratePrice: (variantId: number) => void
  addPending: boolean
  generatingVariantId: number | null
}

export function OfferPricingPanel({
  offer,
  orgSlug,
  onSavePricing,
  savePending,
  onAddVariant,
  onDeleteVariant,
  onGeneratePrice,
  addPending,
  generatingVariantId,
}: OfferPricingPanelProps) {
  const pricingEditable = offer.status === "draft"
  const hasCoaching = offer.offer_products.some(
    (op) => op.products?.type === "coaching"
  )

  const [price, setPrice] = useState(String(offer.price / 100))
  const [currency, setCurrency] = useState(offer.currency)
  const [interval, setInterval] = useState<"month" | "year">(
    offer.interval ?? "month"
  )
  const [installmentCount, setInstallmentCount] = useState(
    String(offer.installment_count ?? "3")
  )
  const [accessMode, setAccessMode] = useState<"lifetime" | "months">(
    offer.access_duration_months != null ? "months" : "lifetime"
  )
  const [accessMonths, setAccessMonths] = useState(
    String(offer.access_duration_months ?? 6)
  )
  const [sessionsCount, setSessionsCount] = useState(
    String(offer.sessions_count ?? 8)
  )

  const [showNewForm, setShowNewForm] = useState(false)
  const [variantLabel, setVariantLabel] = useState("")
  const [variantPrice, setVariantPrice] = useState("")
  const [variantInstallments, setVariantInstallments] = useState("")

  function handleSavePricing(e: FormEvent) {
    e.preventDefault()
    if (!pricingEditable) return
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("A valid price is required")
      return
    }
    const accessDurationMonths =
      accessMode === "lifetime" ? null : parseInt(accessMonths, 10)
    if (
      accessMode === "months" &&
      (!accessDurationMonths || accessDurationMonths < 1)
    ) {
      toast.error("Access duration must be at least 1 month")
      return
    }
    let parsedSessions: number | null = null
    if (hasCoaching) {
      parsedSessions = parseInt(sessionsCount, 10)
      if (!parsedSessions || parsedSessions < 1) {
        toast.error("Sessions included must be at least 1 for coaching offers")
        return
      }
    }
    onSavePricing({
      price: Math.round(parsedPrice * 100),
      currency,
      interval: offer.billing_type === "subscription" ? interval : null,
      installment_count:
        offer.billing_type === "installment"
          ? parseInt(installmentCount, 10) || null
          : null,
      access_duration_months: accessDurationMonths,
      sessions_count: hasCoaching ? parsedSessions : null,
    })
  }

  function handleAddVariant(e: FormEvent) {
    e.preventDefault()
    onAddVariant({
      label: variantLabel.trim() || null,
      price: variantPrice ? Math.round(parseFloat(variantPrice) * 100) : null,
      installment_count: variantInstallments
        ? parseInt(variantInstallments, 10)
        : null,
    })
    setVariantLabel("")
    setVariantPrice("")
    setVariantInstallments("")
    setShowNewForm(false)
  }

  const baseAppUrl =
    (typeof window !== "undefined" && window.location?.origin) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  const base = baseAppUrl.replace(/\/$/, "")
  const orgBase = orgSlug
    ? buildOrgUrl(base || undefined, orgSlug).replace(/\/$/, "")
    : ""
  const baseOfferShareUrl = orgBase
    ? `${orgBase}/buy/${offer.id}`
    : orgSlug
      ? `${base}/org/${orgSlug}/buy/${offer.id}`
      : `${base}/buy/${offer.id}`

  return (
    <div className="space-y-4">
      <SectionCard
        title="Base pricing"
        action={
          <StatusBadge status={pricingEditable ? "editable" : "locked"} />
        }
      >
        {pricingEditable ? (
          <form onSubmit={handleSavePricing} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="offer-price">Price</Label>
                <Input
                  id="offer-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="offer-currency" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFER_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {offer.billing_type === "subscription" && (
              <div className="space-y-2">
                <Label htmlFor="offer-interval">Billing interval</Label>
                <Select
                  value={interval}
                  onValueChange={(v) => {
                    const next = parseBillingInterval(v)
                    if (next) setInterval(next)
                  }}
                >
                  <SelectTrigger id="offer-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {offer.billing_type === "installment" && (
              <div className="space-y-2">
                <Label htmlFor="offer-installments">Number of payments</Label>
                <Input
                  id="offer-installments"
                  type="number"
                  min={2}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Access duration</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAccessMode("lifetime")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
                    accessMode === "lifetime"
                      ? "border-primary bg-primary/5"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Lifetime
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode("months")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
                    accessMode === "months"
                      ? "border-primary bg-primary/5"
                      : "border-border text-muted-foreground"
                  )}
                >
                  Limited months
                </button>
              </div>
              {accessMode === "months" && (
                <Input
                  type="number"
                  min={1}
                  value={accessMonths}
                  onChange={(e) => setAccessMonths(e.target.value)}
                />
              )}
            </div>

            {hasCoaching && (
              <div className="space-y-2">
                <Label htmlFor="offer-sessions">Coaching sessions included</Label>
                <Input
                  id="offer-sessions"
                  type="number"
                  min={1}
                  value={sessionsCount}
                  onChange={(e) => setSessionsCount(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" disabled={savePending}>
              {savePending ? "Saving..." : "Save pricing"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Price
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatAmountFromCents(offer.price, offer.currency)}
                  {offer.billing_type === "subscription" && offer.interval
                    ? ` / ${offer.interval}`
                    : null}
                  {offer.billing_type === "installment" && offer.installment_count
                    ? ` × ${offer.installment_count}`
                    : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Access
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {offer.access_duration_months == null
                    ? "Lifetime"
                    : `${offer.access_duration_months} months`}
                </dd>
              </div>
              {hasCoaching ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sessions
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {offer.sessions_count ?? "-"}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="text-xs text-muted-foreground">
              Published prices can&apos;t be changed. Archive this offer and create a
              new one.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Checkout links"
        action={
          showNewForm ? null : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowNewForm(true)}
              disabled={offer.status !== "active"}
            >
              <Plus className="h-4 w-4" />
              Add variant
            </Button>
          )
        }
      >
        <div className="space-y-3">
          {offer.status === "draft" && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
              <p className="text-sm text-warning-foreground">
                Publish the offer first to share checkout links.
              </p>
            </div>
          )}

          {showNewForm ? (
            <form
              onSubmit={handleAddVariant}
              className="space-y-4 rounded-lg border border-border p-4"
            >
              <p className="text-sm font-semibold text-foreground">New variant</p>
              <div className="space-y-2">
                <Label htmlFor="variant-label">Label</Label>
                <Input
                  id="variant-label"
                  value={variantLabel}
                  onChange={(e) => setVariantLabel(e.target.value)}
                  placeholder='e.g. "3× payment", "Promo -20%"'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="variant-price">Price override (optional)</Label>
                  <Input
                    id="variant-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder={String(offer.price / 100)}
                  />
                </div>
                {offer.billing_type !== "subscription" && (
                  <div className="space-y-2">
                    <Label htmlFor="variant-installments">
                      Installments (optional)
                    </Label>
                    <Input
                      id="variant-installments"
                      type="number"
                      min="2"
                      max="12"
                      value={variantInstallments}
                      onChange={(e) => setVariantInstallments(e.target.value)}
                      placeholder={String(offer.installment_count ?? "")}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addPending}>
                  {addPending ? "Adding..." : "Add variant"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Base offer</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatAmountFromCents(offer.price, offer.currency)}
                {offer.billing_type === "subscription" && ` / ${offer.interval}`}
                {offer.billing_type === "installment" &&
                  offer.installment_count &&
                  ` × ${offer.installment_count}`}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
              <a
                href={baseOfferShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-primary hover:underline"
              >
                {baseOfferShareUrl}
              </a>
              <OfferCopyButton text={baseOfferShareUrl} />
              <a
                href={baseOfferShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>

          {offer.offer_variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              offer={offer}
              shareUrl={
                orgBase
                  ? `${orgBase}/buy/${offer.id}?variantId=${variant.id}`
                  : orgSlug
                    ? `${base}/org/${orgSlug}/buy/${offer.id}?variantId=${variant.id}`
                    : `${base}/buy/${offer.id}?variantId=${variant.id}`
              }
              onDelete={() => onDeleteVariant(variant.id)}
              onGeneratePrice={() => onGeneratePrice(variant.id)}
              generating={generatingVariantId === variant.id}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function VariantCard({
  variant,
  offer,
  shareUrl,
  onDelete,
  onGeneratePrice,
  generating,
}: {
  variant: OfferVariant
  offer: OfferWithDetails
  shareUrl: string
  onDelete: () => void
  onGeneratePrice: () => void
  generating: boolean
}) {
  const effectivePrice = variant.price ?? offer.price
  const effectiveInstallments = variant.installment_count ?? offer.installment_count

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {variant.label ?? "Variant"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatAmountFromCents(Number(effectivePrice), offer.currency)}
            {offer.billing_type !== "subscription" &&
              effectiveInstallments &&
              ` × ${effectiveInstallments}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!variant.stripe_price_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGeneratePrice}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Generate Stripe price
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {variant.stripe_price_id && (
        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-sm text-primary hover:underline"
          >
            {shareUrl}
          </a>
          <OfferCopyButton text={shareUrl} />
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      )}
    </div>
  )
}
