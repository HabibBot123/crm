"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  BookOpen,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import {
  type OfferWithDetails,
  type OfferVariant,
} from "@/lib/services/offers"
import { formatAmountFromCents, buildOrgUrl, cn } from "@/lib/utils"
import { OFFER_CURRENCIES } from "@/lib/constants/offers"
import { toast } from "sonner"
import {
  useAddOfferVariant,
  useDeleteOfferVariant,
  useGenerateOfferVariantPrice,
  useOffer,
  useOfferEnrollmentCount,
  usePublishOffer,
  useUpdateOffer,
  useUpsertOfferProducts,
} from "@/hooks/use-offers"
import { useProducts } from "@/hooks/use-products"
import { useBusinessUnits } from "@/hooks/use-business-units"
import type { updateOffer } from "@/lib/services/offers"

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  paused: "bg-warning/10 text-warning-foreground",
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      title="Copy link"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

export default function OfferEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { canAccess, guardContent, currentOrganization } = useCoachAccessGuard({
    requireOrg: true,
    noOrgMessage: "Select an organization to edit offers.",
  })
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManageCatalog = can("catalog.manage")
  const offerId = Number(id)
  const stripeReady = currentOrganization?.stripe_onboarding_completed === true

  const [deleteVariantId, setDeleteVariantId] = useState<number | null>(null)
  const [generatingVariantId, setGeneratingVariantId] = useState<number | null>(null)

  const { offer, isLoading, error } = useOffer(
    offerId,
    !!currentOrganization?.id && !Number.isNaN(offerId) && offerId > 0
  )

  const updateOfferMutation = useUpdateOffer(currentOrganization?.id ?? null, offerId)

  const addVariantMutation = useAddOfferVariant(offerId)

  const deleteVariantMutation = useDeleteOfferVariant(offerId)

  const publishMutation = usePublishOffer(currentOrganization?.id ?? null, offerId)

  const generateVariantMutation = useGenerateOfferVariantPrice(offerId)

  function requireStripeToSell() {
    if (stripeReady) return true
    toast.error("Connect Stripe to publish this offer.")
    router.push("/dashboard/stripe-connect")
    return false
  }

  function handlePublish() {
    if (!requireStripeToSell()) return
    publishMutation.mutate()
  }

  function handleGenerateVariantPrice(variantId: number) {
    if (!currentOrganization?.id) return
    if (!requireStripeToSell()) return
    setGeneratingVariantId(variantId)
    generateVariantMutation.mutate(
      { organizationId: currentOrganization.id, paymentLinkId: variantId },
      { onSettled: () => setGeneratingVariantId(null) }
    )
  }

  if (!canAccess && guardContent) {
    return <div className="p-4 lg:p-8">{guardContent}</div>
  }

  if (!capsLoading && !canManageCatalog) {
    return (
      <NoAccessState
        title="Offers"
        description="You don’t have permission to manage offers with your role."
      />
    )
  }

  if (isLoading || offer === undefined) {
    return (
      <div className="p-4 lg:p-8">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Offer not found or you don&apos;t have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/offers">Back to offers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/offers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              {offer.title}
            </h1>
            <p className="text-sm text-muted-foreground capitalize">
              {offer.billing_type.replace("_", " ")} · {offer.status}
            </p>
          </div>
        </div>
        {offer.status === "draft" && (
          <Button
            size="sm"
            className="gap-2"
            onClick={handlePublish}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {publishMutation.isPending ? "Publishing..." : "Publish"}
          </Button>
        )}
      </div>

      {offer.status === "draft" && !stripeReady && (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            Build your offer first. Connect Stripe when you&apos;re ready to sell.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can edit drafts freely. Publishing creates Stripe prices and unlocks live checkout.
          </p>
          <Button className="mt-3" size="sm" asChild>
            <Link href="/dashboard/stripe-connect">Connect Stripe</Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment-links">Price Variants</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            offer={offer}
            organizationId={currentOrganization?.id ?? null}
            onSave={(input) => updateOfferMutation.mutate(input)}
            savePending={updateOfferMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="payment-links" className="mt-6">
          <VariantsTab
            offer={offer}
            orgSlug={currentOrganization?.slug ?? undefined}
            onAddVariant={(input) => addVariantMutation.mutate(input)}
            onDeleteVariant={(variantId) => setDeleteVariantId(variantId)}
            onGeneratePrice={handleGenerateVariantPrice}
            addPending={addVariantMutation.isPending}
            generatingVariantId={generatingVariantId}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Archive offer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Archived offers are hidden from your catalog. Existing enrollments
                    remain active, but the underlying Stripe product and prices will be
                    deactivated.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateOfferMutation.mutate({ status: "archived" })}
                  disabled={updateOfferMutation.isPending || offer.status === "archived"}
                >
                  {offer.status === "archived"
                    ? "Archived"
                    : updateOfferMutation.isPending
                      ? "Archiving..."
                      : "Archive"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete variant */}
      <AlertDialog
        open={deleteVariantId !== null}
        onOpenChange={(open) => !open && setDeleteVariantId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? The Stripe price will still exist
              but will no longer be tracked here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteVariantId !== null && deleteVariantMutation.mutate(deleteVariantId)}
              disabled={deleteVariantMutation.isPending}
            >
              {deleteVariantMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ----------------------------------------------------------------
// Overview Tab
// ----------------------------------------------------------------

function OverviewTab({
  offer,
  organizationId,
  onSave,
  savePending,
}: {
  offer: OfferWithDetails
  organizationId: number | null
  onSave: (input: Parameters<typeof updateOffer>[2]) => void
  savePending: boolean
}) {
  const [title, setTitle] = useState(offer.title)
  const [description, setDescription] = useState(offer.description ?? "")
  const [keyFeatures, setKeyFeatures] = useState<string[]>(
    offer.key_features && offer.key_features.length > 0 ? offer.key_features : [""]
  )
  const [price, setPrice] = useState(String(offer.price / 100))
  const [currency, setCurrency] = useState(offer.currency)
  const [interval, setInterval] = useState<"month" | "year">(offer.interval ?? "month")
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
  const [businessUnitId, setBusinessUnitId] = useState<string>(
    offer.business_unit_id == null ? "none" : String(offer.business_unit_id)
  )
  const [selectedProductIds, setSelectedProductIds] = useState(
    offer.offer_products.map((op) => op.product_id)
  )

  const enrollmentCountQuery = useOfferEnrollmentCount(offer.id, true)
  const canEditProducts = (enrollmentCountQuery.data ?? 1) === 0
  const upsertProductsMutation = useUpsertOfferProducts(organizationId, offer.id)
  const { data: productsPage } = useProducts(organizationId, 1, 200)
  const { units: businessUnits } = useBusinessUnits(organizationId)
  const publishedProducts = (productsPage?.items ?? []).filter(
    (p) => p.status === "published"
  )

  const hasCoaching = offer.offer_products.some((op) => op.products?.type === "coaching")
    || selectedProductIds.some((id) =>
      publishedProducts.find((p) => p.id === id)?.type === "coaching"
    )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return
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
    const normalizedKeyFeatures = keyFeatures
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
      .slice(0, 5)

    onSave({
      title,
      description: description || null,
      key_features: normalizedKeyFeatures.length > 0 ? normalizedKeyFeatures : null,
      price: Math.round(parsedPrice * 100),
      currency,
      interval: offer.billing_type === "subscription" ? interval : null,
      installment_count:
        offer.billing_type === "installment"
          ? parseInt(installmentCount, 10) || null
          : null,
      access_duration_months: accessDurationMonths,
      sessions_count: hasCoaching ? parsedSessions : null,
      business_unit_id: businessUnitId === "none" ? null : Number(businessUnitId),
    })
  }

  const toggleProduct = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Included products</h3>
        {canEditProducts ? (
          <>
            <p className="text-xs text-muted-foreground">
              No purchases yet  -  you can change the products in this offer.
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
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {product.type === "course" ? (
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-primary shrink-0" />
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
          </>
        ) : (
          <>
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
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-primary shrink-0" />
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
          </>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="offer-title">Offer name</Label>
          <Input
            id="offer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="offer-desc">Description</Label>
          <Textarea
            id="offer-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Key features (max 5)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setKeyFeatures((prev) => (prev.length >= 5 ? prev : [...prev, ""]))
              }
              disabled={keyFeatures.length >= 5}
            >
              Add feature
            </Button>
          </div>
          <div className="space-y-2">
            {keyFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={feature}
                  onChange={(e) =>
                    setKeyFeatures((prev) =>
                      prev.map((v, i) => (i === idx ? e.target.value : v))
                    )
                  }
                  placeholder={`Feature ${idx + 1}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setKeyFeatures((prev) =>
                      prev.length === 1 ? [""] : prev.filter((_, i) => i !== idx)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="offer-business-unit">Business unit</Label>
          <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
            <SelectTrigger id="offer-business-unit">
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
            Optional. Enrollments for this offer inherit this BU for permissions and reporting.
            One offer per BU if you need the same product in multiple units.
          </p>
        </div>

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

        <div className="grid grid-cols-[1fr_auto] gap-3">
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
              onValueChange={(v) => setInterval(v as "month" | "year")}
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

        <Button type="submit" disabled={savePending}>
          {savePending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  )
}

// ----------------------------------------------------------------
// Variants Tab
// ----------------------------------------------------------------

function VariantsTab({
  offer,
  orgSlug,
  onAddVariant,
  onDeleteVariant,
  onGeneratePrice,
  addPending,
  generatingVariantId,
}: {
  offer: OfferWithDetails
  orgSlug?: string
  onAddVariant: (input: { label?: string | null; price?: number | null; installment_count?: number | null }) => void
  onDeleteVariant: (variantId: number) => void
  onGeneratePrice: (variantId: number) => void
  addPending: boolean
  generatingVariantId: number | null
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [variantLabel, setVariantLabel] = useState("")
  const [variantPrice, setVariantPrice] = useState("")
  const [variantInstallments, setVariantInstallments] = useState("")

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault()
    onAddVariant({
      label: variantLabel.trim() || null,
      price: variantPrice ? Math.round(parseFloat(variantPrice) * 100) : null,
      installment_count: variantInstallments ? parseInt(variantInstallments, 10) : null,
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
  const orgBase = orgSlug ? buildOrgUrl(base || undefined, orgSlug).replace(/\/$/, "") : ""
  const baseOfferShareUrl = orgBase
    ? `${orgBase}/buy/${offer.id}`
    : orgSlug
      ? `${base}/org/${orgSlug}/buy/${offer.id}`
      : `${base}/buy/${offer.id}`

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted-foreground">
        Share these links on your site or socials. Buyers see a short CoachStack
        screen, then go straight to Stripe checkout. After payment they return here
        to access their program.
      </p>

      {offer.status === "draft" && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning-foreground">
            Publish the offer first to share variants.
          </p>
        </div>
      )}

      {/* Base offer  -  shareable link from offer_id */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Base offer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatAmountFromCents(offer.price, offer.currency)}
              {offer.billing_type === "subscription" && ` / ${offer.interval}`}
              {offer.billing_type === "installment" &&
                offer.installment_count &&
                ` Ã— ${offer.installment_count}`}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Link to share</p>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <a
              href={baseOfferShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-primary truncate hover:underline"
            >
              {baseOfferShareUrl}
            </a>
            <CopyButton text={baseOfferShareUrl} />
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
      </div>

      {/* Variants */}
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

      {/* New variant form */}
      {showNewForm ? (
        <form
          onSubmit={handleAddVariant}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <p className="text-sm font-semibold text-foreground">New variant</p>
          <div className="space-y-2">
            <Label htmlFor="variant-label">Label</Label>
            <Input
              id="variant-label"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              placeholder='e.g. "3Ã— payment", "Promo -20%"'
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="variant-price">
                Price override{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
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
                  Installments{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
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
            <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPending}>
              {addPending ? "Adding..." : "Add variant"}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowNewForm(true)}
          disabled={offer.status !== "active"}
        >
          <Plus className="h-4 w-4" />
          Add variant
        </Button>
      )}
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
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {variant.label ?? "Variant"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatAmountFromCents(Number(effectivePrice), offer.currency)}
            {offer.billing_type !== "subscription" &&
              effectiveInstallments &&
              ` Ã— ${effectiveInstallments}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!variant.stripe_price_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGeneratePrice}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
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
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Link to share</p>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-primary truncate hover:underline"
            >
              {shareUrl}
            </a>
            <CopyButton text={shareUrl} />
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

