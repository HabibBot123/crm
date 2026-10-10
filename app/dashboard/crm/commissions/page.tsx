"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LayoutList, Search, Settings, Users, Wallet, X } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  useCommissions,
  useCommissionsSummaryByMember,
  useMarkCommissionsPaid,
  useMarkCommissionsUnpaid,
} from "@/hooks/use-commissions"
import { formatCommissionCents } from "@/components/dashboard/crm/lead-commissions-panel"
import {
  CommissionsFiltersPopover,
  commissionsAmountToCents,
  emptyCommissionsFilters,
  resolveCommissionStatusQuery,
  roleFilterLabel,
  statusFilterLabel,
  type CommissionAttributionRole,
  type CommissionStatusFilter,
  type CommissionsFilterValues,
} from "@/components/dashboard/crm/commissions-filters-popover"
import { TeamPlanGate } from "@/components/dashboard/team-plan-gate"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { cn } from "@/lib/utils"
import type { Commission, CommissionStatus } from "@/schemas/crm.schema"

const pageSize = 10

const ROLE_LABELS: Record<string, string> = {
  closer: "Closer",
  setter: "Setter",
  ambassador: "Ambassador",
  business_unit: "Head",
  coach: "Coach",
}

const COMMISSION_STATUS_CONFIGS = {
  pending: { label: "Pending", variant: "warning" as const },
  overdue: { label: "Overdue", variant: "destructive" as const },
  paid: { label: "Paid", variant: "success" as const },
  canceled: { label: "Canceled", variant: "muted" as const },
}

function roleLabel(attributionType: string | null | undefined): string {
  if (attributionType == null) return "—"
  return ROLE_LABELS[attributionType] ?? attributionType
}

function isCommissionStatus(value: string): value is CommissionStatus {
  return value === "pending" || value === "paid" || value === "canceled"
}

function formatDueChip(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isDueOverdue(dueAt: string | null | undefined, status: string): boolean {
  if (status !== "pending" || dueAt == null) return false
  return new Date(dueAt).getTime() < Date.now()
}

type ViewMode = "table" | "by_member"

export default function CommissionsPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode, can, isLoading: capsLoading } = useOrgCapabilities()
  const organizationId = currentOrganization?.id ?? null
  const memberId = currentOrganization?.member_id ?? null
  const canPay = can("commissions.mark_paid")
  const canViewAll = can("commissions.view_all")
  const canViewCommissions = can("commissions.view_own") || canViewAll
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search")?.trim() ?? ""
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState<CommissionsFilterValues>(emptyCommissionsFilters)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("table")

  const scopedMemberId = canViewAll ? undefined : memberId ?? undefined

  const listFilters = useMemo(() => {
    const statusQuery = resolveCommissionStatusQuery(filters.statuses)
    return {
      statuses: statusQuery.statuses,
      overdueOnly: statusQuery.overdueOnly,
      memberId: scopedMemberId,
      search,
      attributionTypes: filters.roles.length > 0 ? filters.roles : undefined,
      amountMinCents: commissionsAmountToCents(filters.amountMin),
      amountMaxCents: commissionsAmountToCents(filters.amountMax),
      dueFrom: filters.dueFrom ?? undefined,
      dueTo: filters.dueTo ?? undefined,
    }
  }, [filters, scopedMemberId, search])

  const { commissions, total, isLoading } = useCommissions(organizationId, {
    page,
    pageSize,
    ...listFilters,
  })
  const { summaries, isLoading: summaryLoading } = useCommissionsSummaryByMember(
    organizationId,
    listFilters,
    viewMode === "by_member"
  )
  const markPaid = useMarkCommissionsPaid(organizationId)
  const markUnpaid = useMarkCommissionsUnpaid(organizationId)

  useEffect(() => {
    const fromUrl = searchParams.get("search")?.trim() ?? ""
    setSearchInput(fromUrl)
    setSearch(fromUrl)
    setPage(1)
    setSelectedIds([])
  }, [searchParams])

  const hasAmountFilter = filters.amountMin != null || filters.amountMax != null
  const hasDueFilter = filters.dueFrom != null || filters.dueTo != null
  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.roles.length > 0 ||
    hasAmountFilter ||
    hasDueFilter

  const selectedPending = useMemo(
    () =>
      commissions.filter(
        (item) => selectedIds.includes(item.id) && item.status === "pending"
      ),
    [commissions, selectedIds]
  )
  const selectedPaid = useMemo(
    () =>
      commissions.filter(
        (item) => selectedIds.includes(item.id) && item.status === "paid"
      ),
    [commissions, selectedIds]
  )
  const selectedPendingCents = selectedPending.reduce(
    (sum, item) => sum + item.commission_amount,
    0
  )
  const selectedPaidCents = selectedPaid.reduce(
    (sum, item) => sum + item.commission_amount,
    0
  )

  function applySearch() {
    setPage(1)
    setSearch(searchInput.trim())
    setSelectedIds([])
  }

  function applyFilters(next: CommissionsFilterValues) {
    setFilters(next)
    setPage(1)
    setSelectedIds([])
  }

  function removeStatus(status: CommissionStatusFilter) {
    applyFilters({
      ...filters,
      statuses: filters.statuses.filter((item) => item !== status),
    })
  }

  function removeRole(role: CommissionAttributionRole) {
    applyFilters({
      ...filters,
      roles: filters.roles.filter((item) => item !== role),
    })
  }

  function clearAmountFilter() {
    applyFilters({
      ...filters,
      amountMin: null,
      amountMax: null,
    })
  }

  function clearDueFilter() {
    applyFilters({
      ...filters,
      dueFrom: null,
      dueTo: null,
    })
  }

  function amountChipLabel(): string {
    const min = filters.amountMin
    const max = filters.amountMax
    if (min != null && max != null) return `${min}–${max}€`
    if (min != null) return `≥ ${min}€`
    if (max != null) return `≤ ${max}€`
    return "Amount"
  }

  function dueChipLabel(): string {
    const from = filters.dueFrom
    const to = filters.dueTo
    if (from != null && to != null) {
      return `${formatDueChip(from)} – ${formatDueChip(to)}`
    }
    if (from != null) return `From ${formatDueChip(from)}`
    if (to != null) return `Until ${formatDueChip(to)}`
    return "Due"
  }

  function toggleSelected(item: Commission) {
    if (!canPay) return
    if (item.status !== "pending" && item.status !== "paid") return
    setSelectedIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    )
  }

  if (orgMode.requiresTeamPlan) {
    return (
      <div className="min-w-0 space-y-4 p-6 lg:p-8">
        <PageHeader
          title="Commissions"
          subtitle="Track acquisition payouts for your team"
        />
        <TeamPlanGate
          title="Commissions are a Team feature"
          description="This option is for when you have a team (setters, closers, ambassadors) and need to split commissions."
        />
      </div>
    )
  }

  if (!capsLoading && !canViewCommissions) {
    return (
      <NoAccessState
        title="Commissions"
        description="You don’t have permission to view commissions with your role."
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Commissions"
        subtitle="Track amounts owed by lead / pack. Mark paid when you settle with your team."
      >
        {can("org.settings") ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/settings?section=commissions">
              <Settings className="mr-1.5 h-4 w-4" />
              Settings
            </Link>
          </Button>
        ) : null}
      </PageHeader>

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
              placeholder="Search by lead, email, or beneficiary"
            />
            <CommissionsFiltersPopover values={filters} onApply={applyFilters} />
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
                viewMode === "by_member"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setViewMode("by_member")
                setSelectedIds([])
              }}
            >
              <Users className="h-3.5 w-3.5" />
              By member
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
                    commissionIds: selectedPending.map((item) => item.id),
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
                  { commissionIds: selectedPaid.map((item) => item.id) },
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
                {statusFilterLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {filters.roles.map((value) => (
              <Button
                key={`role-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeRole(value)}
              >
                {roleFilterLabel(value)}
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

      {viewMode === "by_member" ? (
        summaryLoading ? (
          <SectionCard>
            <LoadingRows count={6} />
          </SectionCard>
        ) : summaries.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No pending payouts"
            description="No members have pending commissions matching these filters."
          />
        ) : (
          <SectionCard noPadding>
            <TableScroll>
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Member
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
                    <tr key={row.member_id} className="hover:bg-accent/60">
                      <td className="px-4 py-3 font-medium">
                        {row.member_name ?? `Member #${row.member_id}`}
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
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCommissionCents(row.pending_cents)}
                      </td>
                      {canPay ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {(row.overdue_ids?.length ?? 0) > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={markPaid.isPending || memberId == null}
                                onClick={() => {
                                  if (memberId == null) return
                                  markPaid.mutate({
                                    commissionIds: row.overdue_ids ?? [],
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
                                (row.pending_ids?.length ?? 0) === 0
                              }
                              onClick={() => {
                                if (memberId == null) return
                                markPaid.mutate({
                                  commissionIds: row.pending_ids ?? [],
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
      ) : commissions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No commissions yet"
          description="Activate commissions on a converted lead from the CRM side panel."
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
                  {canPay ? <th className="px-4 py-3 w-10" /> : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Beneficiary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installment
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
                </tr>
              </thead>
              <tbody>
                {commissions.map((item) => {
                  const checked = selectedIds.includes(item.id)
                  const canSelect =
                    canPay && (item.status === "pending" || item.status === "paid")
                  const overdue = isDueOverdue(item.due_at, item.status)
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-accent/60",
                        canSelect ? "cursor-pointer" : null,
                        checked ? "bg-accent/40" : null
                      )}
                      onClick={() => {
                        if (canSelect) toggleSelected(item)
                      }}
                    >
                      {canPay ? (
                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                          {canSelect ? (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSelected(item)}
                              aria-label="Select commission"
                              className="rounded-md shadow-sm"
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {item.member_name ?? (item.member_id ? `#${item.member_id}` : "—")}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {item.lead_name ??
                            item.lead_email ??
                            (item.lead_id != null
                              ? `Lead #${item.lead_id}`
                              : item.enrollment_id != null
                                ? `Enrollment #${item.enrollment_id}`
                                : "—")}
                        </div>
                        {item.lead_email && item.lead_name ? (
                          <div className="text-xs text-muted-foreground">
                            {item.lead_email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {roleLabel(item.attribution_type)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.installment_index}/{item.installment_count}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.due_at
                          ? new Date(item.due_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCommissionCents(item.commission_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <StatusBadge status="overdue" configs={COMMISSION_STATUS_CONFIGS} />
                        ) : isCommissionStatus(item.status) ? (
                          <StatusBadge
                            status={item.status}
                            configs={COMMISSION_STATUS_CONFIGS}
                          />
                        ) : (
                          item.status
                        )}
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
