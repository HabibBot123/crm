"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, MoreHorizontal, Pencil, Archive, Package, Repeat, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import type { OfferListItem } from "@/lib/services/offers"
import { cn, formatAmountFromCents } from "@/lib/utils"
import { toast } from "sonner"
import { useArchiveOffer, useOffersPage } from "@/hooks/use-offers"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { RichListItem } from "@/components/dashboard/rich-list-item"

const billingTypeIcon: Record<string, typeof Package> = {
  subscription: Repeat,
  one_time: Package,
  installment: Gift,
}

const billingTypeLabel: Record<string, string> = {
  subscription: "Subscription",
  one_time: "One-time",
  installment: "Installment",
}

/** Local mapping — billing type is categorical, not enrollment status (§7 design system). */
const billingTypeBadgeClass: Record<string, string> = {
  subscription: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  one_time: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  installment: "border-chart-5/20 bg-chart-5/10 text-chart-5",
}

const perPage = 10

function formatPrice(offer: OfferListItem): string {
  const basePrice = formatAmountFromCents(offer.price, offer.currency) ?? ""
  if (offer.billing_type === "subscription") {
    return `${basePrice} / ${offer.interval === "year" ? "yr" : "mo"}`
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${basePrice} × ${offer.installment_count}`
  }
  return basePrice
}

function OfferActions({
  offer,
  archivingId,
  setArchivingId,
  archiveMutation,
}: {
  offer: OfferListItem
  archivingId: number | null
  setArchivingId: (id: number | null) => void
  archiveMutation: ReturnType<typeof useArchiveOffer>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/offers/${offer.id}`} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        {offer.status !== "archived" && (
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              setArchivingId(offer.id)
              archiveMutation.mutate(offer.id, {
                onSettled: () => setArchivingId(null),
              })
            }}
            disabled={archiveMutation.isPending || archivingId === offer.id}
          >
            <Archive className="h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function OffersPage() {
  const { canAccess, guardContent, currentOrganization } = useCoachAccessGuard({
    requireOrg: true,
    requireStripe: true,
    noOrgMessage: "Select an organization to view offers.",
    stripeDescription:
      "To create and manage offers, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter: true,
  })
  const [page, setPage] = useState(1)
  const [archivingId, setArchivingId] = useState<number | null>(null)

  const orgId = currentOrganization?.id ?? null

  const { items, total, isLoading, error } = useOffersPage(orgId, "all", page, perPage)

  useEffect(() => {
    if (error) toast.error((error as Error).message)
  }, [error])

  useEffect(() => {
    setPage(1)
  }, [orgId])

  const archiveMutation = useArchiveOffer(orgId)

  if (!canAccess && guardContent) {
    return <div className="space-y-4 p-6 lg:p-8">{guardContent}</div>
  }

  const subtitle =
    total === 0 && !isLoading
      ? "No offers yet"
      : `${total} offer${total !== 1 ? "s" : ""} total`

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Offers" subtitle={subtitle}>
        <Link href="/dashboard/offers/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New offer
          </Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={5} />
        </SectionCard>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No offers yet"
          description="Create your first offer to start selling."
          action={
            <Button className="gap-2" asChild>
              <Link href="/dashboard/offers/new">
                <Plus className="h-4 w-4" />
                Create your first offer
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            <ul className="space-y-3">
              {items.map((offer) => {
                const Icon = billingTypeIcon[offer.billing_type] ?? Package
                const billingClass =
                  billingTypeBadgeClass[offer.billing_type] ??
                  "border-border bg-muted text-muted-foreground"
                return (
                  <RichListItem key={offer.id} className="flex-col items-stretch gap-3">
                    <div className="flex w-full min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/offers/${offer.id}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {offer.title}
                        </Link>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatPrice(offer)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {offer.offer_products.length} product{offer.offer_products.length !== 1 ? "s" : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-normal normal-case", billingClass)}
                          >
                            {billingTypeLabel[offer.billing_type] ?? offer.billing_type}
                          </Badge>
                          <StatusBadge status={offer.status} className="font-normal" />
                        </div>
                      </div>
                      <OfferActions
                        offer={offer}
                        archivingId={archivingId}
                        setArchivingId={setArchivingId}
                        archiveMutation={archiveMutation}
                      />
                    </div>
                  </RichListItem>
                )
              })}
            </ul>
            {total > perPage && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaginationSummary page={page} pageSize={perPage} total={total} />
                <PaginationControls page={page} pageSize={perPage} total={total} onPageChange={setPage} />
              </div>
            )}
          </div>

          <SectionCard
            noPadding
            className="hidden lg:block"
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaginationSummary page={page} pageSize={perPage} total={total} />
                <PaginationControls page={page} pageSize={perPage} total={total} onPageChange={setPage} />
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Billing
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((offer) => {
                    const Icon = billingTypeIcon[offer.billing_type] ?? Package
                    const billingClass =
                      billingTypeBadgeClass[offer.billing_type] ??
                      "border-border bg-muted text-muted-foreground"
                    return (
                      <tr key={offer.id} className="transition-colors hover:bg-accent/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <Link
                              href={`/dashboard/offers/${offer.id}`}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              {offer.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-normal normal-case", billingClass)}
                          >
                            {billingTypeLabel[offer.billing_type] ?? offer.billing_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatPrice(offer)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {offer.offer_products.length} product{offer.offer_products.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={offer.status} className="font-normal" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <OfferActions
                            offer={offer}
                            archivingId={archivingId}
                            setArchivingId={setArchivingId}
                            archiveMutation={archiveMutation}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}
