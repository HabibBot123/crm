"use client"

import { useMemo, useState } from "react"
import { Building2, LayoutList, Search, Users, X } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { formatCommissionCents } from "@/components/dashboard/crm/lead-commissions-panel"
import {
  BuOwnerSettlementsFiltersPopover,
  emptyBuOwnerSettlementsFilters,
  resolveSettlementStatusQuery,
  settlementStatusFilterLabel,
  settlementsAmountToCents,
  type BuOwnerSettlementsFilterValues,
  type SettlementStatusFilter,
} from "@/components/dashboard/crm/bu-owner-settlements-filters-popover"
import {
  useBuOwnerSettlements,
  useBuOwnerSettlementsSummaryByOwner,
  useMarkBuOwnerSettlementsPaid,
  useMarkBuOwnerSettlementsUnpaid,
} from "@/hooks/use-bu-owner-settlements"
import { cn } from "@/lib/utils"
import type { BuOwnerSettlement } from "@/schemas/bu-owner-settlements.schema"

const STATUS_CONFIGS = {
  pending: { label: "Pending", variant: "warning" as const },
  overdue: { label: "Overdue", variant: "destructive" as const },
  paid: { label: "Paid", variant: "success" as const },
}

type ViewMode = "table" | "by_owner"

const pageSize = 25

function formatPeriod(start: string, end: string): string {
  const from = new Date(`${start}T12:00:00`)
  const to = new Date(`${end}T12:00:00`)
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth()
  if (sameMonth) {
    return from.toLocaleDateString("en-US", { month: "short", year: "numeric" })
  }
  return `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

function formatDue(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDueChip(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOverdue(row: BuOwnerSettlement): boolean {
  return row.status === "pending" && new Date(row.due_at).getTime() < Date.now()
}

function statusKeyOf(row: BuOwnerSettlement): "pending" | "overdue" | "paid" {
  if (row.status === "paid") return "paid"
  return isOverdue(row) ? "overdue" : "pending"
}

function basisLabel(basis: BuOwnerSettlement["settlement_basis"]): string {
  return basis === "of_residual" ? "Residual" : "Revenue"
}

function SettlementCalcDetail({ row }: { row: BuOwnerSettlement }) {
  const isResidual = row.settlement_basis === "of_residual"
  const rate =
    row.commission_rate != null && Number.isFinite(row.commission_rate)
      ? row.commission_rate
      : null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Calculation
      </p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">Revenue (BU packs)</span>
        <span className="tabular-nums text-foreground">
          {formatCommissionCents(row.revenue_cents)}
        </span>
      </div>
      {isResidual ? (
        <>
          <div className="flex items-center justify-between gap-6">
            <span className="text-muted-foreground">− Team and coach costs</span>
            <span className="tabular-nums text-foreground">
              {formatCommissionCents(row.team_costs_cents)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-border pt-1.5">
            <span className="font-medium text-foreground">Residual base</span>
            <span className="tabular-nums font-medium text-foreground">
              {formatCommissionCents(row.basis_cents)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-6 border-t border-border pt-1.5">
          <span className="font-medium text-foreground">Revenue base</span>
          <span className="tabular-nums font-medium text-foreground">
            {formatCommissionCents(row.basis_cents)}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">
          × Rate{rate != null ? ` (${rate}%)` : ""}
        </span>
        <span className="tabular-nums text-foreground">
          {rate != null ? `${rate}%` : "Fixed / none"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-6 border-t border-border pt-1.5">
        <span className="font-medium text-foreground">Settlement</span>
        <span className="tabular-nums font-medium text-foreground">
          {formatCommissionCents(row.amount_cents)}
        </span>
      </div>
    </div>
  )
}

export function BuOwnerSettlementsTable({
  organizationId,
  memberId,
  canPay,
}: {
  organizationId: number | null
  memberId: number | null
  canPay: boolean
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<BuOwnerSettlementsFilterValues>(
    emptyBuOwnerSettlementsFilters
  )
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const listFilters = useMemo(() => {
    const statusQuery = resolveSettlementStatusQuery(filters.statuses)
    return {
      search,
      statuses: statusQuery.statuses,
      overdueOnly: statusQuery.overdueOnly,
      amountMinCents: settlementsAmountToCents(filters.amountMin),
      amountMaxCents: settlementsAmountToCents(filters.amountMax),
      dueFrom: filters.dueFrom ?? undefined,
      dueTo: filters.dueTo ?? undefined,
    }
  }, [filters, search])

  const { settlements, total, isLoading } = useBuOwnerSettlements(
    organizationId,
    {
      ...listFilters,
      page,
      pageSize,
    }
  )
  const { summaries, isLoading: summaryLoading } =
    useBuOwnerSettlementsSummaryByOwner(
      organizationId,
      listFilters,
      viewMode === "by_owner"
    )
  const markPaid = useMarkBuOwnerSettlementsPaid(organizationId)
  const markUnpaid = useMarkBuOwnerSettlementsUnpaid(organizationId)

  const selectedPending = useMemo(
    () =>
      settlements.filter(
        (row) => selectedIds.includes(row.id) && row.status === "pending"
      ),
    [selectedIds, settlements]
  )
  const selectedPaid = useMemo(
    () =>
      settlements.filter(
        (row) => selectedIds.includes(row.id) && row.status === "paid"
      ),
    [selectedIds, settlements]
  )
  const selectedPendingCents = selectedPending.reduce(
    (sum, row) => sum + row.amount_cents,
    0
  )
  const selectedPaidCents = selectedPaid.reduce(
    (sum, row) => sum + row.amount_cents,
    0
  )

  const hasAmountFilter = filters.amountMin != null || filters.amountMax != null
  const hasDueFilter = filters.dueFrom != null || filters.dueTo != null
  const hasActiveFilters =
    filters.statuses.length > 0 || hasAmountFilter || hasDueFilter

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
    setSelectedIds([])
  }

  function applyFilters(next: BuOwnerSettlementsFilterValues) {
    setFilters(next)
    setPage(1)
    setSelectedIds([])
  }

  function removeStatus(status: SettlementStatusFilter) {
    applyFilters({
      ...filters,
      statuses: filters.statuses.filter((value) => value !== status),
    })
  }

  function clearAmountFilter() {
    applyFilters({ ...filters, amountMin: null, amountMax: null })
  }

  function clearDueFilter() {
    applyFilters({ ...filters, dueFrom: null, dueTo: null })
  }

  function amountChipLabel(): string {
    const min = filters.amountMin
    const max = filters.amountMax
    if (min != null && max != null) return `Amount ${min} to ${max} €`
    if (min != null) return `Amount ≥ ${min} €`
    if (max != null) return `Amount ≤ ${max} €`
    return "Amount"
  }

  function dueChipLabel(): string {
    const from = filters.dueFrom
    const to = filters.dueTo
    if (from != null && to != null) {
      return `Due ${formatDueChip(from)} – ${formatDueChip(to)}`
    }
    if (from != null) return `Due from ${formatDueChip(from)}`
    if (to != null) return `Due until ${formatDueChip(to)}`
    return "Due"
  }

  function toggleSelected(row: BuOwnerSettlement) {
    if (!canPay) return
    if (row.status !== "pending" && row.status !== "paid") return
    setSelectedIds((prev) =>
      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-full pl-9 pr-11"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch()
              }}
              placeholder="Search by owner or business unit"
            />
            <BuOwnerSettlementsFiltersPopover
              values={filters}
              onApply={applyFilters}
            />
          </div>
          <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setViewMode("table")
                setPage(1)
                setSelectedIds([])
              }}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                viewMode === "by_owner"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setViewMode("by_owner")
                setSelectedIds([])
              }}
            >
              <Users className="h-3.5 w-3.5" />
              By owner
            </button>
          </div>
          {canPay && viewMode === "table" && selectedPending.length > 0 ? (
            <Button
              size="sm"
              disabled={markPaid.isPending || memberId == null}
              onClick={() => {
                if (memberId == null) return
                markPaid.mutate(
                  {
                    settlementIds: selectedPending.map((row) => row.id),
                    paidByMemberId: memberId,
                  },
                  { onSuccess: () => setSelectedIds([]) }
                )
              }}
            >
              Mark {selectedPending.length} paid
              {selectedPendingCents > 0
                ? ` · ${formatCommissionCents(selectedPendingCents)}`
                : ""}
            </Button>
          ) : null}
          {canPay && viewMode === "table" && selectedPaid.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={markUnpaid.isPending}
              onClick={() => {
                markUnpaid.mutate(
                  { settlementIds: selectedPaid.map((row) => row.id) },
                  { onSuccess: () => setSelectedIds([]) }
                )
              }}
            >
              Mark {selectedPaid.length} pending
              {selectedPaidCents > 0
                ? ` · ${formatCommissionCents(selectedPaidCents)}`
                : ""}
            </Button>
          ) : null}
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
                {settlementStatusFilterLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
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
            {hasDueFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={clearDueFilter}
              >
                {dueChipLabel()}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {viewMode === "by_owner" ? (
        summaryLoading ? (
          <SectionCard>
            <LoadingRows count={6} />
          </SectionCard>
        ) : summaries.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No pending settlements"
            description="No BU Owners have pending settlements matching these filters."
          />
        ) : (
          <SectionCard noPadding>
            <TableScroll>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Pending
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Overdue
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total due
                    </th>
                    {canPay ? (
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((row) => (
                    <tr key={row.owner_member_id} className="hover:bg-accent/60">
                      <td className="px-4 py-3 font-medium">
                        {row.owner_name ?? `Member #${row.owner_member_id}`}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.pending_count}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right",
                          row.overdue_count > 0
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {row.overdue_count > 0
                          ? `${row.overdue_count} · ${formatCommissionCents(row.overdue_cents)}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCommissionCents(row.pending_cents)}
                      </td>
                      {canPay ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {row.overdue_ids.length > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={markPaid.isPending || memberId == null}
                                onClick={() => {
                                  if (memberId == null) return
                                  markPaid.mutate({
                                    settlementIds: row.overdue_ids,
                                    paidByMemberId: memberId,
                                  })
                                }}
                              >
                                Pay overdue
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              disabled={
                                markPaid.isPending ||
                                memberId == null ||
                                row.pending_ids.length === 0
                              }
                              onClick={() => {
                                if (memberId == null) return
                                markPaid.mutate({
                                  settlementIds: row.pending_ids,
                                  paidByMemberId: memberId,
                                })
                              }}
                            >
                              Pay all
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </SectionCard>
        )
      ) : isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : settlements.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No BU Owner settlements"
          description="No settlements match these filters."
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
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  setSelectedIds([])
                }}
              />
            </div>
          }
        >
          <TableScroll>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/60 border-b border-border">
                <tr>
                  {canPay ? <th className="w-10 px-4 py-3" /> : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Basis
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Due
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((row) => {
                  const checked = selectedIds.includes(row.id)
                  const canSelect =
                    canPay && (row.status === "pending" || row.status === "paid")
                  const statusKey = statusKeyOf(row)
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-accent/60",
                        canSelect ? "cursor-pointer" : null,
                        checked ? "bg-accent/40" : null
                      )}
                      onClick={() => {
                        if (canSelect) toggleSelected(row)
                      }}
                    >
                      {canPay ? (
                        <td
                          className="px-4 py-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canSelect ? (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSelected(row)}
                              aria-label="Select settlement"
                              className="rounded-md shadow-sm"
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.owner_name ?? `Member #${row.owner_member_id}`}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.business_unit_name ?? `Unit #${row.business_unit_id}`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPeriod(row.period_start, row.period_end)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {basisLabel(row.settlement_basis)}
                        {row.commission_rate != null
                          ? ` · ${row.commission_rate}%`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDue(row.due_at)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCommissionCents(row.amount_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusKey} configs={STATUS_CONFIGS} />
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <HoverCard openDelay={120} closeDelay={80}>
                          <HoverCardTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground"
                            >
                              See details
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent
                            align="end"
                            className="w-72 p-3 text-sm"
                          >
                            <SettlementCalcDetail row={row} />
                          </HoverCardContent>
                        </HoverCard>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </SectionCard>
      )}
    </div>
  )
}
