"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, BookOpen, MessageCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStripeConnectGuard } from "@/hooks/use-stripe-connect-guard"
import { useAuth } from "@/hooks/use-auth"
import { fetchProductsByOrganization, type Product } from "@/lib/services/products"
import {
  createOffer,
  deriveBillingType,
  type BillingType,
} from "@/lib/services/offers"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { OFFER_CURRENCIES } from "@/lib/constants/offers"

export default function NewOfferPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const { canAccess, guardContent, currentOrganization } = useStripeConnectGuard({
    noOrgMessage: "Select an organization to create offers.",
    stripeDescription:
      "To create offers, you need to complete Stripe Connect onboarding for this organization.",
  })

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState("eur")
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [billingTypeOverride, setBillingTypeOverride] = useState<"one_time" | "installment" | null>(null)
  const [installmentCount, setInstallmentCount] = useState("3")

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", currentOrganization?.id],
    queryFn: () => fetchProductsByOrganization(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  })

  const publishedProducts = products.filter((p) => p.status === "published")

  const selectedProducts = publishedProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  )

  const autoBillingType = selectedProducts.length > 0
    ? deriveBillingType(selectedProducts.map((p) => p.type))
    : null

  // Final billing type: if auto is subscription, locked in. Otherwise user can pick one_time or installment
  const effectiveBillingType: BillingType | null =
    autoBillingType === "subscription"
      ? "subscription"
      : billingTypeOverride ?? autoBillingType

  const isBundle =
    selectedProducts.some((p) => p.type === "content") &&
    selectedProducts.some((p) => p.type === "coaching")

  const createMutation = useMutation({
    mutationFn: () =>
      createOffer(supabase, {
        organization_id: currentOrganization!.id,
        title: title.trim(),
        description: description.trim() || null,
        billing_type: effectiveBillingType!,
        price: parseFloat(price),
        currency,
        interval: effectiveBillingType === "subscription" ? interval : null,
        installment_count:
          effectiveBillingType === "installment"
            ? parseInt(installmentCount, 10)
            : null,
        product_ids: selectedProductIds,
      }),
    onSuccess: (offer) => {
      queryClient.invalidateQueries({
        queryKey: ["offers", currentOrganization?.id],
      })
      toast.success("Offer created")
      router.push(`/dashboard/offers/${offer.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
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
    if (effectiveBillingType === "installment") {
      const count = parseInt(installmentCount, 10)
      if (!count || count < 2) {
        toast.error("Installment count must be at least 2")
        return
      }
    }
    createMutation.mutate()
  }

  const toggleProduct = (product: Product) => {
    setSelectedProductIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    )
    // Reset billing type override when selection changes
    setBillingTypeOverride(null)
  }

  if (!canAccess && guardContent) {
    return <div className="p-4 lg:p-8">{guardContent}</div>
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
                      {product.type === "content" ? (
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
                <span className="text-muted-foreground">Auto-detected billing: </span>
                <span className="font-medium text-foreground capitalize">
                  {autoBillingType === "subscription"
                    ? "Subscription (recurring)"
                    : "One-time payment (or installments)"}
                </span>
                {isBundle && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Bundle
                  </Badge>
                )}
              </div>
              <Button onClick={() => setStep(2)} className="w-full">
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
                  {p.type === "content" ? (
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
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included in this offer?"
              rows={3}
            />
          </div>

          {/* Billing type selector for non-subscription */}
          {autoBillingType !== "subscription" && (
            <div className="space-y-2">
              <Label>Payment type</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBillingTypeOverride("one_time")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors focus:outline-none",
                    (billingTypeOverride ?? "one_time") === "one_time"
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  Single payment
                </button>
                <button
                  type="button"
                  onClick={() => setBillingTypeOverride("installment")}
                  className={cn(
                    "flex-1 rounded-lg border-2 p-3 text-sm font-medium transition-colors focus:outline-none",
                    billingTypeOverride === "installment"
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  Installments
                </button>
              </div>
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
          {effectiveBillingType === "subscription" && (
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
          {effectiveBillingType === "installment" && (
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
