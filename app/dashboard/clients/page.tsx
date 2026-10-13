"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Search,
  Mail,
  UserCheck,
  Users,
  UserX,
  Calendar,
  Package,
  Plus,
  X,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  useClients,
  useClientDetail,
  useCreateManualEnrollment,
  type ClientSummary,
} from "@/hooks/use-clients"
import { useOffers } from "@/hooks/use-offers"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn, formatAmountFromCents } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { AddManualEnrollmentDialog } from "@/components/dashboard/clients/add-manual-enrollment-dialog"
import {
  ClientsFiltersPopover,
  clientsAmountToCents,
  emptyClientsFilters,
  statusFilterLabel,
  type ClientStatusFilter,
  type ClientsFilterValues,
} from "@/components/dashboard/clients/clients-filters-popover"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Users }
> = {
  active: {
    label: "Active",
    color: "bg-success/10 text-success border-success/20",
    icon: UserCheck,
  },
  expired: {
    label: "Expired",
    color: "bg-muted text-muted-foreground border-border",
    icon: UserX,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: UserX,
  },
  paused: {
    label: "Paused",
    color: "bg-warning/10 text-warning-foreground border-warning/20",
    icon: Users,
  },
}

function getStatusConfig(status: string) {
  return statusConfig[status] ?? statusConfig.paused
}

function getInitials(display: string): string {
  if (display === "—" || !display.trim()) return "?"
  const parts = display.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return display.slice(0, 2).toUpperCase()
}

function formatCurrency(amountCents: number): string {
  return formatAmountFromCents(amountCents, "EUR") ?? "—"
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const perPage = 25

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const { can } = useOrgCapabilities()
  const canViewClients = can("clients.view")
  const canEnrollManual = can("clients.enroll_manual")
  const initialSearch = searchParams.get("search")?.trim() ?? ""
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState<ClientsFilterValues>(emptyClientsFilters)
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const fromUrl = searchParams.get("search")?.trim() ?? ""
    setSearchInput(fromUrl)
    setSearch(fromUrl)
    setPage(1)
  }, [searchParams])

  const applySearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: ClientsFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removeStatus(status: ClientStatusFilter) {
    applyFilters({
      ...filters,
      statuses: filters.statuses.filter((item) => item !== status),
    })
  }

  function clearTotalSpentFilter() {
    applyFilters({
      ...filters,
      totalSpentMin: null,
      totalSpentMax: null,
    })
  }

  function clearFirstJoinedFilter() {
    applyFilters({
      ...filters,
      firstJoinedFrom: null,
      firstJoinedTo: null,
    })
  }

  function formatJoinedChip(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  function totalSpentChipLabel(): string {
    const min = filters.totalSpentMin
    const max = filters.totalSpentMax
    if (min != null && max != null) return `${min}–${max}€`
    if (min != null) return `≥ ${min}€`
    if (max != null) return `≤ ${max}€`
    return "Total spent"
  }

  function firstJoinedChipLabel(): string {
    const from = filters.firstJoinedFrom
    const to = filters.firstJoinedTo
    if (from != null && to != null) {
      return `${formatJoinedChip(from)} – ${formatJoinedChip(to)}`
    }
    if (from != null) return `From ${formatJoinedChip(from)}`
    if (to != null) return `Until ${formatJoinedChip(to)}`
    return "First joined"
  }

  const hasTotalSpentFilter =
    filters.totalSpentMin != null || filters.totalSpentMax != null
  const hasFirstJoinedFilter =
    filters.firstJoinedFrom != null || filters.firstJoinedTo != null
  const hasActiveFilters =
    filters.statuses.length > 0 || hasTotalSpentFilter || hasFirstJoinedFilter

  const { data, isLoading: dataLoading, error } = useClients({
    organizationId: currentOrganization?.id ?? null,
    page,
    pageSize: perPage,
    search,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
    totalSpentMinCents: clientsAmountToCents(filters.totalSpentMin),
    totalSpentMaxCents: clientsAmountToCents(filters.totalSpentMax),
    firstJoinedFrom: filters.firstJoinedFrom ?? undefined,
    firstJoinedTo: filters.firstJoinedTo ?? undefined,
  })

  const { data: clientDetail, isLoading: detailLoading } = useClientDetail({
    organizationId: currentOrganization?.id ?? null,
    clientKey: selectedClientKey,
  })

  const { offers, isLoading: offersLoading } = useOffers(
    currentOrganization?.id ?? null,
    "active"
  )
  const createManual = useCreateManualEnrollment(currentOrganization?.id ?? null)

  const items = data.items
  const total = data.total
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const isLoading = orgLoading || dataLoading

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="min-w-0 space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to view clients.
        </p>
      </div>
    )
  }

  if (!orgLoading && !canViewClients) {
    return (
      <div className="min-w-0 space-y-4 p-6 lg:p-8">
        <PageHeader title="Clients" subtitle="Clients and enrollments linked to your offers" />
        <EmptyState
          icon={Users}
          title="No access"
          description="You don’t have permission to view clients for this organization."
        />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Clients"
        subtitle="Clients and enrollments linked to your offers"
      >
        {canEnrollManual ? (
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={!currentOrganization}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add enrollment
          </Button>
        ) : null}
      </PageHeader>

      <AddManualEnrollmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        organizationId={currentOrganization?.id ?? null}
        offers={offers}
        offersLoading={offersLoading}
        isPending={createManual.isPending}
        onSubmit={async (input) => {
          if (!currentOrganization) return
          await createManual.mutateAsync({
            organizationId: currentOrganization.id,
            offerId: input.offerId,
            buyerEmail: input.buyerEmail,
            buyerName: input.buyerName,
            priceCents: input.priceCents,
            accessDurationMonths: input.accessDurationMonths,
            soldAt: input.soldAt,
          })
        }}
      />

      <div className="space-y-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-9 pr-11"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch()
            }}
          />
          <ClientsFiltersPopover values={filters} onApply={applyFilters} />
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.statuses.map((value) => (
              <Button
                key={`status-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeStatus(value)}
              >
                {statusFilterLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {hasTotalSpentFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={clearTotalSpentFilter}
              >
                {totalSpentChipLabel()}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
            {hasFirstJoinedFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={clearFirstJoinedFilter}
              >
                {firstJoinedChipLabel()}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <SectionCard><LoadingRows count={5} /></SectionCard>
      ) : error ? (
        <SectionCard>
          <p className="text-center text-sm text-destructive">{(error as Error).message}</p>
        </SectionCard>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            total === 0 && !search.trim() && !hasActiveFilters
              ? "No clients yet"
              : "No clients match your search"
          }
          description={
            total === 0 && !search.trim() && !hasActiveFilters
              ? "Enrollments appear after purchases, or add one manually."
              : "Try another search or clear the filters."
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {items.map((client: ClientSummary) => {
              const config = getStatusConfig(client.status)
              const emailDisplay = client.client_email ?? "—"
              return (
                <button
                  key={client.client_key}
                  type="button"
                  onClick={() => setSelectedClientKey(client.client_key)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(client.client_display)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{client.client_display}</p>
                      <p className="truncate text-xs text-muted-foreground">{emailDisplay}</p>
                      {!client.user_id && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">No account yet</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs", config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{formatCurrency(client.total_spent)}</span>
                    <span>{client.enrollment_count} enrollment{client.enrollment_count !== 1 ? "s" : ""}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Desktop table */}
          <SectionCard
            noPadding
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaginationSummary page={page} pageSize={perPage} total={total} />
                <PaginationControls page={page} pageSize={perPage} total={total} onPageChange={setPage} />
              </div>
            }
          >
            <TableScroll className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total spent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrollments</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">First joined</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((client: ClientSummary) => {
                    const config = getStatusConfig(client.status)
                    const emailDisplay = client.client_email ?? "—"
                    return (
                      <tr
                        key={client.client_key}
                        onClick={() => setSelectedClientKey(client.client_key)}
                        className="cursor-pointer transition-colors hover:bg-accent/60"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(client.client_display)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{client.client_display}</p>
                              <p className="text-xs text-muted-foreground">{emailDisplay}</p>
                              {!client.user_id && (
                                <Badge variant="secondary" className="mt-0.5 text-[10px]">No account yet</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs capitalize", config.color)}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCurrency(client.total_spent)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{client.enrollment_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.first_enrollment_started_at ? formatDate(client.first_enrollment_started_at) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroll>
          </SectionCard>
        </>
      )}

      {/* Client Detail Sheet */}
      <Sheet
        open={!!selectedClientKey}
        onOpenChange={(open) => !open && setSelectedClientKey(null)}
      >
        <SheetContent className="overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>Client</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 p-4">
            {detailLoading ? (
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-md bg-muted" />
                <div className="h-24 animate-pulse rounded-md bg-muted" />
              </div>
            ) : clientDetail ? (
              <>
                <div className="space-y-3 border-b border-border pb-4 pr-10">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-tight text-foreground">
                      {clientDetail.client_display}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {clientDetail.email_display}
                    </p>
                  </div>
                  {!clientDetail.has_account ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        No account yet
                      </Badge>
                    </div>
                  ) : null}
                </div>

                <section className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Enrollments ({clientDetail.enrollments.length})
                  </h4>
                  <ul className="space-y-2">
                    {clientDetail.enrollments.map((en) => (
                      <li
                        key={en.enrollment_id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {en.offer_title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-xs capitalize",
                              getStatusConfig(en.enrollment_status).color
                            )}
                          >
                            {en.enrollment_status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Started: {formatDate(en.enrollment_started_at)}
                          </span>
                          {en.enrollment_expires_at ? (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Expires: {formatDate(en.enrollment_expires_at)}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              No expiry
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {clientDetail.email_for_mailto ? (
                  <Button size="sm" className="w-full gap-2" asChild>
                    <a href={`mailto:${clientDetail.email_for_mailto}`}>
                      <Mail className="h-4 w-4" />
                      Send email
                    </a>
                  </Button>
                ) : null}
              </>
            ) : selectedClientKey ? (
              <p className="text-sm text-muted-foreground">Client not found.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
