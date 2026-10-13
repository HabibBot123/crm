"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, BookOpen, MessageCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { StoreBioEditor } from "@/components/storefront/store-bio-editor"
import { toRichTextHtml } from "@/lib/branding/sanitize-bio-html"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { type Product } from "@/lib/services/products"
import {
  deriveBillingType,
  type BillingType,
} from "@/lib/services/offers"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { OFFER_CURRENCIES } from "@/lib/constants/offers"
import { useCreateOffer } from "@/hooks/use-offers"
import { useProducts } from "@/hooks/use-products"
import { useBusinessUnits } from "@/hooks/use-business-units"

export default function NewOfferPage() {
  const router = useRouter()
  const { canAccess, guardContent, currentOrganization } = useCoachAccessGuard({
    requireOrg: true,
    noOrgMessage: "Select an organization to create offers.",
  })
  const { can, isLoading: capsLoading } = useOrgCapabilities()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("eur")
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [billingType, setBillingType] = useState<BillingType>("one_time")
  const [installmentCount, setInstallmentCount] = useState("3")
  const [accessMode, setAccessMode] = useState<"lifetime" | "months">("lifetime")
  const [accessMonths, setAccessMonths] = useState("6")
  const [sessionsCount, setSessionsCount] = useState("8")
  const [businessUnitId, setBusinessUnitId] = useState("none")

  // This page is a “product picker” for offer creation; we still keep it bounded.
  const PRODUCTS_PICKER_PAGE_SIZE = 200
  const { data: productsPage, isLoading: productsLoading } = useProducts(
    currentOrganization?.id ?? null,
    1,
    PRODUCTS_PICKER_PAGE_SIZE
  )

  const publishedProducts = productsPage.items.filter((p) => p.status === "published")

  const selectedProducts = publishedProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  )

  const suggestedBillingType =
    selectedProducts.length > 0
      ? deriveBillingType(selectedProducts.map((p) => p.type))
      : null

  const hasCoaching = selectedProducts.some((p) => p.type === "coaching")

  const isBundle =
    selectedProducts.some((p) => p.type === "course") &&
    selectedProducts.some((p) => p.type === "coaching")

  const createMutation = useCreateOffer(currentOrganization?.id ?? null)
  const { units: businessUnits } = useBusinessUnits(currentOrganization?.id ?? null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    const parsedPrice = parseFloat(price)
    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("A valid price is required")
      return
    }
    if (billingType === "installment") {
      const count = parseInt(installmentCount, 10)
      if (!count || count < 2) {
        toast.error("Installment count must be at least 2")
        return
      }
    }
    const accessDurationMonths =
      accessMode === "lifetime" ? null : parseInt(accessMonths, 10)
    if (accessMode === "months" && (!accessDurationMonths || accessDurationMonths < 1)) {
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
    createMutation.mutate(
      {
        organization_id: currentOrganization!.id,
        title: title.trim(),
        description: toRichTextHtml(description),
        key_features: null,
        billing_type: billingType,
        price: Math.round(parseFloat(price) * 100),
        currency,
        interval: billingType === "subscription" ? interval : null,
        installment_count:
          billingType === "installment" ? parseInt(installmentCount, 10) : null,
        access_duration_months: accessDurationMonths,
        sessions_count: parsedSessions,
        business_unit_id: businessUnitId === "none" ? null : Number(businessUnitId),
        product_ids: selectedProductIds,
      },
      {
        onSuccess: (offer) => {
          router.push(`/dashboard/offers/${offer.id}`)
        },
      }
    )
  }

  const toggleProduct = (product: Product) => {
    setSelectedProductIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    )
  }

  const goToStep2 = () => {
    if (suggestedBillingType) setBillingType(suggestedBillingType)
    setStep(2)
  }

  if (!canAccess && guardContent) {
    return <div className="p-4 lg:p-8">{guardContent}</div>
  }

  if (!capsLoading && !can("catalog.manage")) {
    return (
      <NoAccessState
        title="Offers"
        description="You don’t have permission to manage offers with your role."
      />
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/dashboard/offers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-foreground font-display">New offer</h1>

      {step === 1 ? (
        <div className="mt-8 max-w-2xl">
          <p className="text-sm text-muted-foreground mb-6">
            Select one or more published products to include in this offer.
          </p>

          {productsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : publishedProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No published products found. Publish at least one product first.
              </p>
              <Button className="mt-4" asChild variant="outline">
                <Link href="/dashboard/products">Go to products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedProducts.map((product) => {
                const selected = selectedProductIds.includes(product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-xl border-2 bg-card p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      {product.type === "course" ? (
                        <BookOpen className="h-5 w-5 text-primary" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {product.title}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {product.type}
                      </p>
                    </div>
                    {selected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedProductIds.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Suggested billing: </span>
                <span className="font-medium text-foreground capitalize">
                  {suggestedBillingType === "subscription"
                    ? "Subscription"
                    : "One-time (or installments)"}
                </span>
                {isBundle && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Bundle
                  </Badge>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  You can change billing type on the next step.
                </p>
              </div>
              <Button onClick={goToStep2} className="w-full">
                Continue to pricing
              </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-6">
          {/* Selected products recap */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Included products
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {selectedProducts.map((p) => (
                <Badge key={p.id} variant="secondary" className="gap-1.5 text-xs">
                  {p.type === "course" ? (
                    <BookOpen className="h-3 w-3" />
                  ) : (
                    <MessageCircle className="h-3 w-3" />
                  )}
                  {p.title}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Offer name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Premium Fitness Bundle"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <StoreBioEditor
              value={description}
              onChange={setDescription}
              maxChars={2000}
              contentClassName="min-h-[160px] max-h-[280px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-offer-bu">Business unit</Label>
            <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
              <SelectTrigger id="new-offer-bu">
                <SelectValue placeholder="Organization-wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (organization-wide)</SelectItem>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional. Create one offer per BU if the same package is sold in several units.
            </p>
          </div>

          {/* Billing type — free choice */}
          <div className="space-y-2">
            <Label>Payment type</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  { value: "one_time", label: "One-time" },
                  { value: "subscription", label: "Subscription" },
                  { value: "installment", label: "Installments" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBillingType(opt.value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm font-medium transition-colors focus:outline-none",
                    billingType === opt.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Access duration</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccessMode("lifetime")}
                className={cn(
                  "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors focus:outline-none",
                  accessMode === "lifetime"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                Lifetime
              </button>
              <button
                type="button"
                onClick={() => setAccessMode("months")}
                className={cn(
                  "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors focus:outline-none",
                  accessMode === "months"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
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
                placeholder="e.g. 6"
              />
            )}
          </div>

          {hasCoaching && (
            <div className="space-y-2">
              <Label htmlFor="sessions-count">Coaching sessions included</Label>
              <Input
                id="sessions-count"
                type="number"
                min={1}
                value={sessionsCount}
                onChange={(e) => setSessionsCount(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="49.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="w-24">
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

          {/* Subscription interval */}
          {billingType === "subscription" && (
            <div className="space-y-2">
              <Label htmlFor="interval">Billing interval</Label>
              <Select
                value={interval}
                onValueChange={(v) => setInterval(v as "month" | "year")}
              >
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Installment count */}
          {billingType === "installment" && (
            <div className="space-y-2">
              <Label htmlFor="installment-count">Number of payments</Label>
              <Input
                id="installment-count"
                type="number"
                min="2"
                max="12"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                placeholder="3"
              />
              {price && installmentCount && !isNaN(parseFloat(price)) && !isNaN(parseInt(installmentCount, 10)) && parseInt(installmentCount, 10) >= 2 && (
                <p className="text-xs text-muted-foreground">
                  {parseInt(installmentCount, 10)} × {currency.toUpperCase()}{" "}
                  {(parseFloat(price) / parseInt(installmentCount, 10)).toFixed(2)} per payment
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create offer"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
