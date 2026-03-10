"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStripeConnectGuard } from "@/hooks/use-stripe-connect-guard"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchOfferWithDetails,
  updateOffer,
  deleteOffer,
  createOfferPaymentLink,
  deleteOfferPaymentLink,
  fetchEnrollmentsByOffer,
  type OfferWithDetails,
  type OfferPaymentLink,
  type Enrollment,
} from "@/lib/services/offers"
import { cn } from "@/lib/utils"
import { OFFER_CURRENCIES } from "@/lib/constants/offers"
import { toast } from "sonner"

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
  const { supabase } = useAuth()
  const { canAccess, guardContent, currentOrganization } = useStripeConnectGuard({
    noOrgMessage: "Select an organization to edit offers.",
    stripeDescription:
      "To edit offers, you need to complete Stripe Connect onboarding for this organization.",
  })
  const offerId = Number(id)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteLinkId, setDeleteLinkId] = useState<number | null>(null)
  const [generatingLinkId, setGeneratingLinkId] = useState<number | null>(null)

  const { data: offer, isLoading, error } = useQuery({
    queryKey: ["offer", offerId],
    queryFn: () => fetchOfferWithDetails(supabase, offerId),
    enabled: !!currentOrganization?.id && !Number.isNaN(offerId) && offerId > 0,
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments", offerId],
    queryFn: () => fetchEnrollmentsByOffer(supabase, offerId),
    enabled: !!offer,
  })

  const updateOfferMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateOffer>[2]) =>
      updateOffer(supabase, offerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      toast.success("Offer updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteOfferMutation = useMutation({
    mutationFn: () => deleteOffer(supabase, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", currentOrganization?.id] })
      router.push("/dashboard/offers")
      toast.success("Offer deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addLinkMutation = useMutation({
    mutationFn: (input: Parameters<typeof createOfferPaymentLink>[2]) =>
      createOfferPaymentLink(supabase, offerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      toast.success("Variant added")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: number) => deleteOfferPaymentLink(supabase, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      setDeleteLinkId(null)
      toast.success("Variant deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setDeleteLinkId(null)
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe-offers/create-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: currentOrganization!.id, offerId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to publish offer")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      queryClient.invalidateQueries({ queryKey: ["offers", currentOrganization?.id] })
      toast.success("Offer published")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const generateLinkMutation = useMutation({
    mutationFn: async (variantId: number) => {
      setGeneratingLinkId(variantId)
      const res = await fetch("/api/stripe-offers/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: currentOrganization!.id,
          offerId,
          paymentLinkId: variantId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to generate payment link")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer", offerId] })
      toast.success("Payment link generated")
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setGeneratingLinkId(null),
  })

  if (!canAccess && guardContent) {
    return <div className="p-4 lg:p-8">{guardContent}</div>
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
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {publishMutation.isPending ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payment-links">Payment Links</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            offer={offer}
            onSave={(input) => updateOfferMutation.mutate(input)}
            savePending={updateOfferMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="payment-links" className="mt-6">
          <PaymentLinksTab
            offer={offer}
            onAddVariant={(input) => addLinkMutation.mutate(input)}
            onDeleteVariant={(linkId) => setDeleteLinkId(linkId)}
            onGenerateLink={(variantId) => generateLinkMutation.mutate(variantId)}
            addPending={addLinkMutation.isPending}
            generatingLinkId={generatingLinkId}
          />
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <EnrollmentsTab enrollments={enrollments} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete offer</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently remove this offer and all its payment links. Existing
                    enrollments will not be affected.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteOfferMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete offer */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{offer.title}&quot;? This will remove
              all payment link variants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOfferMutation.mutate()}
              disabled={deleteOfferMutation.isPending}
            >
              {deleteOfferMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete payment link variant */}
      <AlertDialog
        open={deleteLinkId !== null}
        onOpenChange={(open) => !open && setDeleteLinkId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment link variant? The Stripe Payment
              Link will still exist but will no longer be tracked here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteLinkId !== null && deleteLinkMutation.mutate(deleteLinkId)}
              disabled={deleteLinkMutation.isPending}
            >
              {deleteLinkMutation.isPending ? "Deleting…" : "Delete"}
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
  onSave,
  savePending,
}: {
  offer: OfferWithDetails
  onSave: (input: Parameters<typeof updateOffer>[2]) => void
  savePending: boolean
}) {
  const [title, setTitle] = useState(offer.title)
  const [description, setDescription] = useState(offer.description ?? "")
  const [price, setPrice] = useState(String(offer.price))
  const [currency, setCurrency] = useState(offer.currency)
  const [interval, setInterval] = useState<"month" | "year">(offer.interval ?? "month")
  const [installmentCount, setInstallmentCount] = useState(
    String(offer.installment_count ?? "3")
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return
    }
    onSave({
      title,
      description: description || null,
      price: parsedPrice,
      currency,
      interval: offer.billing_type === "subscription" ? interval : null,
      installment_count:
        offer.billing_type === "installment"
          ? parseInt(installmentCount, 10) || null
          : null,
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Products included */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Included products
        </h3>
        {offer.offer_products.length === 0 ? (
          <p className="text-xs text-muted-foreground">No products linked.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {offer.offer_products.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                {op.products?.type === "content" ? (
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
      </div>

      {/* Edit form */}
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
              disabled={offer.status === "active"}
            />
            {offer.status === "active" && (
              <p className="text-xs text-muted-foreground">
                Price is locked once the offer is published (Stripe price is immutable).
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={setCurrency}
              disabled={offer.status === "active"}
            >
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
              disabled={offer.status === "active"}
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
              min="2"
              max="12"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              disabled={offer.status === "active"}
            />
          </div>
        )}

        <Button type="submit" disabled={savePending || offer.status === "active"}>
          {savePending ? "Saving…" : "Save details"}
        </Button>
      </form>
    </div>
  )
}

// ----------------------------------------------------------------
// Payment Links Tab
// ----------------------------------------------------------------

function PaymentLinksTab({
  offer,
  onAddVariant,
  onDeleteVariant,
  onGenerateLink,
  addPending,
  generatingLinkId,
}: {
  offer: OfferWithDetails
  onAddVariant: (input: { label?: string | null; price?: number | null; installment_count?: number | null }) => void
  onDeleteVariant: (linkId: number) => void
  onGenerateLink: (variantId: number) => void
  addPending: boolean
  generatingLinkId: number | null
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [variantLabel, setVariantLabel] = useState("")
  const [variantPrice, setVariantPrice] = useState("")
  const [variantInstallments, setVariantInstallments] = useState("")

  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault()
    onAddVariant({
      label: variantLabel.trim() || null,
      price: variantPrice ? parseFloat(variantPrice) : null,
      installment_count: variantInstallments ? parseInt(variantInstallments, 10) : null,
    })
    setVariantLabel("")
    setVariantPrice("")
    setVariantInstallments("")
    setShowNewForm(false)
  }

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted-foreground">
        Generate shareable Stripe Payment Links for this offer. You can create variants
        with different prices or installment plans.
      </p>

      {offer.status === "draft" && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-warning-foreground">
            Publish the offer first to generate payment links.
          </p>
        </div>
      )}

      {/* Base offer link — auto-created at publish time, stored on offer.stripe_payment_link */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Base offer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {offer.currency.toUpperCase()} {Number(offer.price).toFixed(2)}
              {offer.billing_type === "subscription" && ` / ${offer.interval}`}
              {offer.billing_type === "installment" && offer.installment_count && ` × ${offer.installment_count}`}
            </p>
          </div>
        </div>
        {offer.stripe_payment_link ? (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <a
              href={offer.stripe_payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-sm text-primary truncate hover:underline"
            >
              {offer.stripe_payment_link}
            </a>
            <CopyButton text={offer.stripe_payment_link} />
            <a
              href={offer.stripe_payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {offer.status === "draft"
              ? "Publish the offer to generate the base payment link."
              : "Base payment link not yet generated."}
          </p>
        )}
      </div>

      {/* Variants */}
      {offer.offer_payment_links.map((link) => (
          <PaymentLinkCard
            key={link.id}
            link={link}
            offer={offer}
            onDelete={() => onDeleteVariant(link.id)}
            onGenerate={() => onGenerateLink(link.id)}
            generating={generatingLinkId === link.id}
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
              placeholder='e.g. "3× payment", "Promo -20%"'
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
                placeholder={String(offer.price)}
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
              {addPending ? "Adding…" : "Add variant"}
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

function PaymentLinkCard({
  link,
  offer,
  onDelete,
  onGenerate,
  generating,
}: {
  link: OfferPaymentLink
  offer: OfferWithDetails
  onDelete: () => void
  onGenerate: () => void
  generating: boolean
}) {
  const effectivePrice = link.price ?? offer.price
  const effectiveInstallments = link.installment_count ?? offer.installment_count

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {link.label ?? "Variant"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {offer.currency.toUpperCase()} {Number(effectivePrice).toFixed(2)}
            {offer.billing_type !== "subscription" && effectiveInstallments && ` × ${effectiveInstallments}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!link.stripe_payment_link && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Generate link
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
      {link.stripe_payment_link && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <a
            href={link.stripe_payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-primary truncate hover:underline"
          >
            {link.stripe_payment_link}
          </a>
          <CopyButton text={link.stripe_payment_link} />
          <a
            href={link.stripe_payment_link}
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

// ----------------------------------------------------------------
// Enrollments Tab
// ----------------------------------------------------------------

function EnrollmentsTab({ enrollments }: { enrollments: Enrollment[] }) {
  const pending = enrollments.filter((e) => !e.user_id)

  if (enrollments.length === 0) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          No enrollments yet. Share a payment link to start accepting students.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      {pending.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
          <p className="text-sm text-warning-foreground font-medium">
            {pending.length} unmatched enrollment{pending.length > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            These buyers have not yet created an account with the email used for
            payment. Their access will be activated automatically when they sign
            in with the same email.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buyer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">
                      {enrollment.buyer_email ?? "—"}
                    </span>
                    {!enrollment.user_id && (
                      <span className="text-xs text-warning-foreground">
                        No account yet
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn("text-xs capitalize", statusStyles[enrollment.status])}
                  >
                    {enrollment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(enrollment.started_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {enrollment.expires_at
                    ? new Date(enrollment.expires_at).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
