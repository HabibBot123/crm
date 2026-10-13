"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { BookOpen, MessageCircle } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { OfferBuyPreviewCard } from "@/components/storefront/offer-buy-preview-card"
import { StoreBioEditor } from "@/components/storefront/store-bio-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBranding } from "@/hooks/use-branding"
import {
  useOfferEnrollmentCount,
  useUpsertOfferProducts,
} from "@/hooks/use-offers"
import { useProducts } from "@/hooks/use-products"
import { toRichTextHtml } from "@/lib/branding/sanitize-bio-html"
import type { OfferWithDetails, UpdateOfferInput } from "@/lib/services/offers"
import { formatAmountFromCents, cn } from "@/lib/utils"
import { toast } from "sonner"

function billingLabelForOffer(offer: OfferWithDetails) {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Annual" : "Monthly"
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${offer.installment_count}× installments`
  }
  return "One-time"
}

function priceLabelForOffer(offer: OfferWithDetails) {
  const amount = formatAmountFromCents(offer.price, offer.currency)
  if (!amount) return null
  if (offer.interval === "month") return `${amount} / mo`
  if (offer.interval === "year") return `${amount} / yr`
  return amount
}

type OfferOverviewPanelProps = {
  offer: OfferWithDetails
  organizationId: number | null
  onSave: (input: UpdateOfferInput) => void
  savePending: boolean
}

export function OfferOverviewPanel({
  offer,
  organizationId,
  onSave,
  savePending,
}: OfferOverviewPanelProps) {
  const brandingQuery = useBranding(organizationId)
  const primaryColor = brandingQuery.data?.primary_color || "#e07b39"

  const [title, setTitle] = useState(offer.title)
  const [description, setDescription] = useState(offer.description ?? "")
  const [selectedProductIds, setSelectedProductIds] = useState(
    offer.offer_products.map((op) => op.product_id)
  )

  const enrollmentCountQuery = useOfferEnrollmentCount(offer.id, true)
  const canEditProducts = (enrollmentCountQuery.data ?? 1) === 0
  const upsertProductsMutation = useUpsertOfferProducts(organizationId, offer.id)
  const { data: productsPage } = useProducts(organizationId, 1, 200)
  const publishedProducts = (productsPage?.items ?? []).filter(
    (p) => p.status === "published"
  )

  function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Offer name is required")
      return
    }
    onSave({
      title: title.trim(),
      description: toRichTextHtml(description),
      key_features: null,
    })
  }

  function toggleProduct(productId: number) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Included products">
        {canEditProducts ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              No purchases yet. You can change the products in this offer.
            </p>
            <div className="space-y-2">
              {publishedProducts.map((product) => {
                const selected = selectedProductIds.includes(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {product.type === "course" ? (
                      <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="flex-1 font-medium">{product.title}</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {product.type}
                    </Badge>
                  </button>
                )
              })}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={
                upsertProductsMutation.isPending || selectedProductIds.length === 0
              }
              onClick={() => upsertProductsMutation.mutate(selectedProductIds)}
            >
              {upsertProductsMutation.isPending ? "Saving..." : "Save products"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {offer.offer_products.length === 0 ? (
              <p className="text-xs text-muted-foreground">No products linked.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {offer.offer_products.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    {op.products?.type === "course" ? (
                      <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {op.products?.title ?? "Unknown product"}
                    </span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {op.products?.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This offer already has purchases. To change products, create a new offer
              and archive this one.
            </p>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/dashboard/offers/new">Create new offer</Link>
            </Button>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Offer details"
        action={
          <Button
            type="submit"
            form="offer-details-form"
            size="sm"
            disabled={savePending}
          >
            {savePending ? "Saving..." : "Save changes"}
          </Button>
        }
      >
        <form id="offer-details-form" onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="offer-title">Offer name</Label>
            <Input
              id="offer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <StoreBioEditor
              value={description}
              onChange={setDescription}
              maxChars={2000}
              contentClassName="min-h-[180px] max-h-[320px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live preview
            </p>
            <div
              className="rounded-xl p-4"
              style={{
                background: `radial-gradient(700px 280px at 50% -10%, ${primaryColor}22, transparent 68%), #fafafa`,
              }}
            >
              <div className="mx-auto w-full max-w-md">
                <OfferBuyPreviewCard
                  title={title}
                  description={description}
                  billingLabel={billingLabelForOffer(offer)}
                  priceLabel={priceLabelForOffer(offer)}
                  primaryColor={primaryColor}
                />
              </div>
            </div>
          </div>
        </form>
      </SectionCard>
    </div>
  )
}
