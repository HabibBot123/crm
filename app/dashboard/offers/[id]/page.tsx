"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Archive, Loader2, Package, Send, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"
import { OfferOverviewPanel } from "@/components/dashboard/offers/offer-overview-panel"
import { OfferPricingPanel } from "@/components/dashboard/offers/offer-pricing-panel"
import { OfferSettingsPanel } from "@/components/dashboard/offers/offer-settings-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useAddOfferVariant,
  useDeleteOfferVariant,
  useGenerateOfferVariantPrice,
  useOffer,
  usePublishOffer,
  useUpdateOffer,
} from "@/hooks/use-offers"
import { toast } from "sonner"

type OfferSection = "overview" | "pricing" | "settings"

const offerNav: NavListItem<OfferSection>[] = [
  { id: "overview", label: "Overview", icon: Package },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "settings", label: "Settings", icon: Archive },
]

export default function OfferEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { canAccess, guardContent, currentOrganization } = useCoachAccessGuard({
    requireOrg: true,
    noOrgMessage: "Select an organization to edit offers.",
  })
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManageCatalog = can("catalog.manage")
  const offerId = Number(id)
  const stripeReady = currentOrganization?.stripe_onboarding_completed === true

  const [section, setSection] = useState<OfferSection>("overview")
  const [deleteVariantId, setDeleteVariantId] = useState<number | null>(null)
  const [generatingVariantId, setGeneratingVariantId] = useState<number | null>(
    null
  )

  const { offer, isLoading, error } = useOffer(
    offerId,
    !!currentOrganization?.id && !Number.isNaN(offerId) && offerId > 0
  )

  const updateOfferMutation = useUpdateOffer(
    currentOrganization?.id ?? null,
    offerId
  )
  const addVariantMutation = useAddOfferVariant(offerId)
  const deleteVariantMutation = useDeleteOfferVariant(offerId)
  const publishMutation = usePublishOffer(
    currentOrganization?.id ?? null,
    offerId
  )
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
    return <div className="space-y-4 p-6 lg:p-8">{guardContent}</div>
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
      <div className="space-y-4 p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Offer not found or you don&apos;t have access.
        </p>
        <Button asChild>
          <Link href="/dashboard/offers">Back to offers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title={offer.title}
        subtitle={`${offer.billing_type.replace("_", " ")} · ${offer.status}`}
        back="/dashboard/offers"
      >
        {offer.status === "draft" ? (
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
        ) : null}
      </PageHeader>

      {offer.status === "draft" && !stripeReady ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-medium text-foreground">
            Build your offer first. Connect Stripe when you&apos;re ready to sell.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can edit drafts freely. Publishing creates Stripe prices and unlocks
            live checkout.
          </p>
          <Button className="mt-3" size="sm" asChild>
            <Link href="/dashboard/stripe-connect">Connect Stripe</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex gap-8">
        <NavList items={offerNav} value={section} onChange={setSection} />

        <div className="min-w-0 flex-1">
          {section === "overview" ? (
            <OfferOverviewPanel
              offer={offer}
              organizationId={currentOrganization?.id ?? null}
              onSave={(input) => updateOfferMutation.mutate(input)}
              savePending={updateOfferMutation.isPending}
            />
          ) : null}

          {section === "pricing" ? (
            <OfferPricingPanel
              offer={offer}
              orgSlug={currentOrganization?.slug ?? undefined}
              onSavePricing={(input) => updateOfferMutation.mutate(input)}
              savePending={updateOfferMutation.isPending}
              onAddVariant={(input) => addVariantMutation.mutate(input)}
              onDeleteVariant={(variantId) => setDeleteVariantId(variantId)}
              onGeneratePrice={handleGenerateVariantPrice}
              addPending={addVariantMutation.isPending}
              generatingVariantId={generatingVariantId}
            />
          ) : null}

          {section === "settings" ? (
            <OfferSettingsPanel
              offer={offer}
              organizationId={currentOrganization?.id ?? null}
              onSave={(input, options) =>
                updateOfferMutation.mutate(input, {
                  onError: options?.onError,
                })
              }
              savePending={updateOfferMutation.isPending}
            />
          ) : null}
        </div>
      </div>

      <AlertDialog
        open={deleteVariantId !== null}
        onOpenChange={(open) => !open && setDeleteVariantId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this variant? The Stripe price will
              still exist but will no longer be tracked here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteVariantId !== null &&
                deleteVariantMutation.mutate(deleteVariantId)
              }
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
