"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Receipt, Search, X } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { SaleDetailSheet } from "@/components/dashboard/sales/sale-detail-sheet"
import {
  emptySalesFilters,
  salesAmountToCents,
  SalesFiltersPopover,
  type SalesFilterValues,
} from "@/components/dashboard/sales/sales-filters-popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useOffers } from "@/hooks/use-offers"
import { useOrganizationSales } from "@/hooks/use-sales"
import type { OrganizationSaleListItem } from "@/lib/services/sales"
import { paymentTypeInfo } from "@/lib/sales/payment-labels"
import { formatAmountFromCents } from "@/lib/utils"
import type { SalePaymentKind, SaleSourceFilter } from "@/schemas/sales.schema"

const pageSize = 15

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function paymentKindLabel(value: SalePaymentKind): string {
  if (value === "subscription") return "Subscription"
  if (value === "installment") return "Installments"
  return "One-time"
}

function sourceLabel(value: SaleSourceFilter): string {
  return value === "manual" ? "Manual" : "Stripe"
}

export default function SalesPage() {
  const searchParams = useSearchParams()
  const { currentOrganization } = useCurrentOrganization()
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const organizationId = currentOrganization?.id ?? null
  const canViewSales = can("sales.view")
  const initialSearch = searchParams.get("search")?.trim() ?? ""

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState<SalesFilterValues>(emptySalesFilters)
  const [selectedSale, setSelectedSale] = useState<OrganizationSaleListItem | null>(null)

  const { offers } = useOffers(organizationId, "all")

  useEffect(() => {
    const fromUrl = searchParams.get("search")?.trim() ?? ""
    setSearchInput(fromUrl)
    setSearch(fromUrl)
    setPage(1)
  }, [searchParams])

  const { sales, total, isLoading } = useOrganizationSales(organizationId, {
    page,
    pageSize,
    search,
    paymentKinds: filters.paymentKinds.length > 0 ? filters.paymentKinds : undefined,
    sources: filters.sources.length > 0 ? filters.sources : undefined,
    offerIds: filters.offerIds.length > 0 ? filters.offerIds : undefined,
    amountMinCents: salesAmountToCents(filters.amountMin),
    amountMaxCents: salesAmountToCents(filters.amountMax),
  })

  const hasAmountFilter = filters.amountMin != null || filters.amountMax != null

  const hasActiveFilters =
    filters.paymentKinds.length > 0 ||
    filters.sources.length > 0 ||
    filters.offerIds.length > 0 ||
    hasAmountFilter

  const hasFilters = search.length > 0 || hasActiveFilters

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: SalesFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removePaymentKind(value: SalePaymentKind) {
    setFilters((prev) => ({
      ...prev,
      paymentKinds: prev.paymentKinds.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeSource(value: SaleSourceFilter) {
    setFilters((prev) => ({
      ...prev,
      sources: prev.sources.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeOfferId(value: number) {
    setFilters((prev) => ({
      ...prev,
      offerIds: prev.offerIds.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function clearAmountFilter() {
    setFilters((prev) => ({
      ...prev,
      amountMin: null,
      amountMax: null,
    }))
    setPage(1)
  }

  function amountChipLabel(): string {
    const min = filters.amountMin
    const max = filters.amountMax
    if (min != null && max != null) return `${min}–${max}€`
    if (min != null) return `≥ ${min}€`
    if (max != null) return `≤ ${max}€`
    return "Amount"
  }

  if (!capsLoading && !canViewSales) {
    return (
      <NoAccessState
        title="Sales"
        description="You don’t have permission to view sales with your role."
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Sales"
        subtitle="Organization revenue: Stripe and manual sales, linked enrollments and commissions."
      />

      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-9 pr-11"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch()
            }}
            placeholder="Search by buyer, lead, or offer"
          />
          <SalesFiltersPopover
            values={filters}
            offers={offers}
            onApply={applyFilters}
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.paymentKinds.map((value) => (
              <Button
                key={`payment-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removePaymentKind(value)}
              >
                {paymentKindLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {filters.sources.map((value) => (
              <Button
                key={`source-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeSource(value)}
              >
                {sourceLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {filters.offerIds.map((offerId) => {
              const title =
                offers.find((offer) => offer.id === offerId)?.title ?? `Offer #${offerId}`
              return (
                <Button
                  key={`offer-${offerId}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => removeOfferId(offerId)}
                >
                  {title}
                  <X className="h-3 w-3" />
                </Button>
              )
            })}
            {hasAmountFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={clearAmountFilter}
              >
                {amountChipLabel()}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No matching sales" : "No sales yet"}
          description={
            hasFilters
              ? "Try another search or clear the filters."
              : "Sales appear when a checkout completes or you record a sale from a converted CRM lead."
          }
        />
      ) : (
        <SectionCard
          noPadding
          footer={
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary page={page} pageSize={pageSize} total={total} />
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </div>
          }
        >
          <TableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Buyer
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Offer
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Payment
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lead
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Commissions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const payment = paymentTypeInfo(sale)
                  return (
                    <tr
                      key={sale.id}
                      className="cursor-pointer hover:bg-accent/60"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(sale.sold_at || sale.created_at)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {sale.buyer_email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {sale.offer_title ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {formatAmountFromCents(sale.price_cents, sale.currency) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div>{payment.title}</div>
                        {payment.detail ? (
                          <div className="text-xs text-muted-foreground">{payment.detail}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={sale.source === "manual" ? "manual" : "stripe"}
                          configs={{
                            manual: { label: "Manual", variant: "muted" },
                            stripe: { label: "Stripe", variant: "default" },
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {sale.lead_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {sale.commissions_total_cents > 0
                          ? (formatAmountFromCents(
                              sale.commissions_total_cents,
                              sale.currency
                            ) ?? "—")
                          : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </SectionCard>
      )}

      <SaleDetailSheet
        sale={selectedSale}
        organizationId={organizationId}
        open={selectedSale != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedSale(null)
        }}
      />
    </div>
  )
}
