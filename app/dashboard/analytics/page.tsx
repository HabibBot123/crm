"use client"

import { useMemo, useState } from "react"
import {
  Crown,
  Handshake,
  Megaphone,
  Phone,
  Scale,
  Wallet,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { AnalyticsFiltersPopover } from "@/components/dashboard/analytics/analytics-filters-popover"
import { MarketingAnalyticsPanel } from "@/components/dashboard/analytics/marketing-analytics-panel"
import {
  SortableKpiHeader,
  nextKpiSort,
  sortByKpiColumn,
  type KpiSortState,
} from "@/components/dashboard/analytics/sortable-kpi-header"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useBusinessUnits } from "@/hooks/use-business-units"
import {
  useCrmMarketingAnalytics,
  useCrmMarketingCampaignAnalytics,
  useCrmSalesAnalytics,
} from "@/hooks/use-analytics"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { formatAmountFromCents, cn } from "@/lib/utils"
import type {
  AnalyticsRoleKind,
  CrmSalesAnalytics,
} from "@/schemas/analytics.schema"

type Preset = "7d" | "30d" | "month" | "quarter" | "year"
type RoleTab = AnalyticsRoleKind
type FinanceMode = "pnl" | "cash"
type AnalyticsSection = "sales" | "marketing"
type MemberSortColumn =
  | "leads"
  | "converted"
  | "conversion_rate"
  | "revenue_cents"
type BuSortColumn =
  | "leads"
  | "converted"
  | "conversion_rate"
  | "revenue_cents"
  | "margin_cents"
  | "share"

function toYmd(date: Date): string {
  return date.toLocaleDateString("en-CA")
}

function parseYmd(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  if (preset === "7d") {
    from.setDate(from.getDate() - 6)
  } else if (preset === "30d") {
    from.setDate(from.getDate() - 29)
  } else if (preset === "month") {
    from.setDate(1)
  } else if (preset === "quarter") {
    const quarterStartMonth = Math.floor(from.getMonth() / 3) * 3
    from.setMonth(quarterStartMonth, 1)
  } else {
    from.setMonth(0, 1)
  }
  return { from: toYmd(from), to: toYmd(to) }
}

function previousRange(
  from: string,
  to: string,
  preset: Preset | "custom"
): { from: string; to: string } {
  if (preset === "month") {
    const start = parseYmd(from)
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0)
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
    return { from: toYmd(prevStart), to: toYmd(prevEnd) }
  }

  if (preset === "quarter") {
    const start = parseYmd(from)
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0)
    const prevStartMonth = Math.floor(prevEnd.getMonth() / 3) * 3
    const prevStart = new Date(prevEnd.getFullYear(), prevStartMonth, 1)
    return { from: toYmd(prevStart), to: toYmd(prevEnd) }
  }

  if (preset === "year") {
    const fromD = parseYmd(from)
    const toD = parseYmd(to)
    return {
      from: toYmd(new Date(fromD.getFullYear() - 1, fromD.getMonth(), fromD.getDate())),
      to: toYmd(new Date(toD.getFullYear() - 1, toD.getMonth(), toD.getDate())),
    }
  }

  const days = daySpan(from, to)
  const prevTo = parseYmd(from)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - (days - 1))
  return { from: toYmd(prevFrom), to: toYmd(prevTo) }
}

function formatMoney(cents: number): string {
  return `${formatAmountFromCents(cents, "EUR") ?? "0.00"}`
}

function daySpan(from: string, to: string): number {
  const ms = parseYmd(to).getTime() - parseYmd(from).getTime()
  return Math.floor(ms / 86_400_000) + 1
}

/** Align revenue chart with RPC commission grain (month for quarter/year). */
function isMonthlyChartGrain(
  preset: Preset | "custom",
  from: string,
  to: string
): boolean {
  if (preset === "quarter" || preset === "year") return true
  return daySpan(from, to) > 60
}

function formatBucketLabel(key: string, monthly: boolean): string {
  if (monthly) {
    const [year, month] = key.split("-").map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    })
  }
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function formatCommissionBucket(bucket: string): string {
  return formatBucketLabel(bucket, bucket.length === 7)
}

function formatCommissionTooltipLabel(bucket: string): string {
  if (bucket.length === 7) {
    const [year, month] = bucket.split("-").map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    })
  }
  const [year, month, day] = bucket.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** Same palette as CRM LeadStatusBadge. */
function pipelineStatusColor(
  statusKey: string,
  catalog: Array<{ key: string; color: string | null }>
): string {
  const fromCatalog = catalog.find((status) => status.key === statusKey)?.color
  if (fromCatalog) return fromCatalog
  if (statusKey === "new") return "#3B82F6"
  if (statusKey === "lost") return "#EF4444"
  if (statusKey === "converted") return "#22C55E"
  return "#e07b39"
}

function buildChartSeries(
  points: CrmSalesAnalytics["revenue_series"],
  from: string,
  to: string,
  monthly: boolean
): Array<{ key: string; label: string; revenue: number }> {
  const totals = new Map<string, number>()

  for (const point of points) {
    const key = monthly ? point.day.slice(0, 7) : point.day
    totals.set(key, (totals.get(key) ?? 0) + point.revenue_cents)
  }

  const keys: string[] = []
  if (monthly) {
    const cursor = new Date(parseYmd(from).getFullYear(), parseYmd(from).getMonth(), 1)
    const end = new Date(parseYmd(to).getFullYear(), parseYmd(to).getMonth(), 1)
    while (cursor <= end) {
      keys.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
      )
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else {
    const cursor = parseYmd(from)
    const end = parseYmd(to)
    while (cursor <= end) {
      keys.push(toYmd(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return keys.map((key) => ({
    key,
    label: formatBucketLabel(key, monthly),
    revenue: (totals.get(key) ?? 0) / 100,
  }))
}

function shareOf(part: number, total: number): number {
  if (total <= 0) return 0
  return (part / total) * 100
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function CompactDelta({
  current,
  previous,
  invert,
}: {
  current: number
  previous: number | undefined
  /** When true, an increase is shown in red (costs). */
  invert?: boolean
}) {
  if (previous == null) {
    return <span className="inline-block w-12 shrink-0" aria-hidden />
  }
  const delta = pctDelta(current, previous)
  if (delta == null) {
    return <span className="inline-block w-12 shrink-0" aria-hidden />
  }
  if (delta === 0) {
    return (
      <span className="inline-block w-12 shrink-0 text-left text-[11px] tabular-nums text-muted-foreground">
        0%
      </span>
    )
  }
  const favorable = invert ? delta < 0 : delta > 0
  return (
    <span
      className={cn(
        "inline-block w-12 shrink-0 text-left text-[11px] font-medium tabular-nums",
        favorable ? "text-success" : "text-destructive"
      )}
    >
      {delta > 0 ? "+" : ""}
      {delta}%
    </span>
  )
}

function ValueWithDelta({
  value,
  previous,
  formatValue,
  invert,
  align = "end",
  valueClassName,
}: {
  value: number
  previous: number | undefined
  formatValue?: (value: number) => string
  invert?: boolean
  align?: "start" | "end"
  valueClassName?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-baseline gap-1",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      <span className={cn("tabular-nums", valueClassName)}>
        {formatValue ? formatValue(value) : String(value)}
      </span>
      <CompactDelta current={value} previous={previous} invert={invert} />
    </div>
  )
}

function MetricWithDelta({
  value,
  previous,
  formatValue,
}: {
  value: number
  previous: number
  formatValue?: (value: number) => string
}) {
  return (
    <ValueWithDelta
      value={value}
      previous={previous}
      formatValue={formatValue}
      valueClassName="text-foreground"
    />
  )
}

function HeroStat({
  label,
  value,
  previous,
  formatValue,
  large,
}: {
  label: string
  value: number
  previous: number | undefined
  formatValue?: (value: number) => string
  large?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1">
        <ValueWithDelta
          value={value}
          previous={previous}
          formatValue={formatValue}
          align="start"
          valueClassName={cn(
            "font-display font-bold tracking-tight text-foreground",
            large ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
        />
      </div>
    </div>
  )
}

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const commissionChartConfig = {
  paid: {
    label: "Paid",
    color: "var(--chart-2)",
  },
  due: {
    label: "Due",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const thClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
/** Extra right pad matches CompactDelta slot (w-12 + gap-1) so labels sit over the figure. */
const thRightClass =
  "py-3 pl-4 pr-[4.25rem] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
const thRightPlainClass =
  "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"

export default function AnalyticsPage() {
  const { currentOrganization } = useCurrentOrganization()
  const {
    can,
    scope,
    ownedBusinessUnitIds,
    isLoading: capsLoading,
  } = useOrgCapabilities()
  const organizationId = currentOrganization?.id ?? null
  const canView = can("analytics.view")
  const canViewCampaigns = can("campaigns.manage")
  const isNaturalHead = scope === "bu"
  const isHeadView = isNaturalHead
  const viewerMode = isHeadView ? "head" : "org"

  const initialRange = useMemo(() => rangeForPreset("30d"), [])
  const [preset, setPreset] = useState<Preset | "custom">("30d")
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [businessUnitId, setBusinessUnitId] = useState<string>("all")
  const [roleTab, setRoleTab] = useState<RoleTab>("closer")
  const [financeMode, setFinanceMode] = useState<FinanceMode>("pnl")
  const [section, setSection] = useState<AnalyticsSection>("sales")
  const [memberSort, setMemberSort] = useState<KpiSortState<MemberSortColumn>>({
    column: "revenue_cents",
    direction: "desc",
  })
  const [buSort, setBuSort] = useState<KpiSortState<BuSortColumn>>({
    column: "revenue_cents",
    direction: "desc",
  })

  const { units } = useBusinessUnits(organizationId)
  const { statuses: leadStatuses } = useOrganizationLeadStatuses(organizationId)

  const filterUnits = useMemo(() => {
    if (isNaturalHead) {
      const owned = new Set(ownedBusinessUnitIds)
      return units.filter((unit) => owned.has(unit.id))
    }
    return units
  }, [isNaturalHead, ownedBusinessUnitIds, units])

  const showBuFilter = filterUnits.length > 0
  const selectedBuId =
    businessUnitId === "all" ? null : Number(businessUnitId)

  const scopeSubtitle = useMemo(() => {
    const selectedUnit =
      selectedBuId == null
        ? null
        : filterUnits.find((unit) => unit.id === selectedBuId) ?? null

    if (isHeadView) {
      if (selectedUnit) return `BU Owner · ${selectedUnit.name}`
      if (filterUnits.length === 1) return `BU Owner · ${filterUnits[0].name}`
      if (filterUnits.length > 1) return "BU Owner · your business units"
      return "BU Owner"
    }

    if (selectedUnit) return `Organization · ${selectedUnit.name}`
    return "Organization"
  }, [filterUnits, isHeadView, selectedBuId])

  const prev = useMemo(
    () => previousRange(from, to, preset),
    [from, to, preset]
  )

  const { data, previous, isLoading } = useCrmSalesAnalytics(organizationId, {
    from,
    to,
    previousFrom: prev.from,
    previousTo: prev.to,
    businessUnitId: selectedBuId,
    preset,
    viewerMode,
    enabled: canView && !capsLoading && section === "sales",
  })

  const {
    data: marketingData,
    previous: marketingPrevious,
    isLoading: marketingLoading,
  } = useCrmMarketingAnalytics(organizationId, {
    from,
    to,
    previousFrom: prev.from,
    previousTo: prev.to,
    businessUnitId: selectedBuId,
    enabled: canView && !capsLoading && section === "marketing",
  })

  const {
    data: marketingCampaignData,
    previous: marketingCampaignPrevious,
    isLoading: marketingCampaignLoading,
  } = useCrmMarketingCampaignAnalytics(organizationId, {
    from,
    to,
    previousFrom: prev.from,
    previousTo: prev.to,
    enabled:
      canView &&
      canViewCampaigns &&
      !capsLoading &&
      section === "marketing",
  })

  const kpis = data?.kpis
  const prevKpis = previous?.kpis

  const chartIsMonthly = isMonthlyChartGrain(preset, from, to)
  const chartData = useMemo(
    () =>
      buildChartSeries(data?.revenue_series ?? [], from, to, chartIsMonthly),
    [data?.revenue_series, from, to, chartIsMonthly]
  )

  const memberRows = useMemo(() => {
    if (!data) return []
    const prevById = new Map(
      (previous?.members ?? [])
        .filter((row) => row.role_kind === roleTab)
        .map((row) => [row.member_id, row])
    )
    const current = sortByKpiColumn(
      data.members.filter((row) => row.role_kind === roleTab),
      memberSort.column,
      memberSort.direction
    )

    return current.map((row) => {
      const prior = prevById.get(row.member_id)
      return {
        ...row,
        prev_leads: prior?.leads ?? 0,
        prev_converted: prior?.converted ?? 0,
        prev_revenue_cents: prior?.revenue_cents ?? 0,
        prev_conversion_rate: prior?.conversion_rate ?? 0,
      }
    })
  }, [data, previous, roleTab, memberSort])

  const pipeline = useMemo(() => {
    if (!data) return []
    return data.funnel.filter((row) => row.count > 0)
  }, [data])

  const pipelineMax = Math.max(...pipeline.map((row) => row.count), 1)
  const businessUnits = data?.business_units ?? []
  const showBusinessUnits = !isHeadView && businessUnits.length >= 2

  const sortedBusinessUnits = useMemo(() => {
    const totalRevenue = kpis?.revenue_cents ?? 0
    const rows = businessUnits.map((row) => {
      const costs =
        financeMode === "cash"
          ? row.commissions_paid_cents
          : row.commissions_cents
      return {
        ...row,
        conversion_rate: row.leads > 0 ? (row.converted / row.leads) * 100 : 0,
        margin_cents: row.revenue_cents - costs,
        share: shareOf(row.revenue_cents, totalRevenue),
      }
    })
    return sortByKpiColumn(rows, buSort.column, buSort.direction)
  }, [businessUnits, buSort, financeMode, kpis?.revenue_cents])

  const costsCents =
    financeMode === "cash"
      ? (kpis?.commissions_paid_cents ?? 0)
      : (kpis?.commissions_cents ?? 0)
  const prevCostsCents =
    financeMode === "cash"
      ? (prevKpis?.commissions_paid_cents ?? 0)
      : (prevKpis?.commissions_cents ?? 0)
  const teamCostsCents =
    financeMode === "cash"
      ? (kpis?.team_commissions_paid_cents ?? 0)
      : (kpis?.team_commissions_cents ?? 0)
  const prevTeamCostsCents =
    financeMode === "cash"
      ? (prevKpis?.team_commissions_paid_cents ?? 0)
      : (prevKpis?.team_commissions_cents ?? 0)
  const buOwnerCostsCents =
    financeMode === "cash"
      ? (kpis?.head_commissions_paid_cents ?? 0)
      : (kpis?.head_commissions_cents ?? 0)
  const prevBuOwnerCostsCents =
    financeMode === "cash"
      ? (prevKpis?.head_commissions_paid_cents ?? 0)
      : (prevKpis?.head_commissions_cents ?? 0)
  const netCents = (kpis?.revenue_cents ?? 0) - costsCents
  const prevNetCents = (prevKpis?.revenue_cents ?? 0) - prevCostsCents

  const commissionShare =
    kpis && kpis.revenue_cents > 0 ? shareOf(costsCents, kpis.revenue_cents) : 0
  const teamShare =
    kpis && kpis.revenue_cents > 0
      ? shareOf(teamCostsCents, kpis.revenue_cents)
      : 0
  const buOwnerShare =
    kpis && kpis.revenue_cents > 0
      ? shareOf(buOwnerCostsCents, kpis.revenue_cents)
      : 0
  const netShare =
    kpis && kpis.revenue_cents > 0 ? shareOf(netCents, kpis.revenue_cents) : 0

  const commissionChartData = useMemo(() => {
    const series = data?.commission_series ?? []
    return series.map((point) => ({
      bucket: point.bucket,
      zone: point.zone,
      label: formatCommissionBucket(point.bucket),
      tooltipLabel: formatCommissionTooltipLabel(point.bucket),
      // Paid stops at the upcoming window. Due stays continuous (0 between spikes).
      paid: point.zone === "history" ? point.paid_cents / 100 : null,
      due: point.forecast_cents / 100,
    }))
  }, [data])
  const commissionChartHasData = commissionChartData.some(
    (point) => (point.paid ?? 0) > 0 || point.due > 0
  )
  const upcomingStartLabel =
    commissionChartData.find((point) => point.zone === "forecast")?.label ??
    null

  const isEmpty =
    !isLoading &&
    !!data &&
    data.kpis.leads === 0 &&
    data.kpis.revenue_cents === 0

  function applyPreset(next: Preset) {
    const range = rangeForPreset(next)
    setPreset(next)
    setFrom(range.from)
    setTo(range.to)
  }

  if (!capsLoading && !canView) {
    return (
      <NoAccessState
        title="Analytics"
        description="You do not have access to analytics."
      />
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Analytics" subtitle={scopeSubtitle}>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:justify-end">
          <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
            {(
              [
                ["sales", "Sales", Wallet],
                ["marketing", "Marketing", Megaphone],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  section === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSection(key)}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex max-w-full flex-wrap items-center rounded-lg bg-muted p-0.5">
            {(
              [
                ["7d", "7d"],
                ["30d", "30d"],
                ["month", "Month"],
                ["quarter", "Quarter"],
                ["year", "Year"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-2 text-sm font-medium transition-colors sm:px-2.5",
                  preset === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => applyPreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <AnalyticsFiltersPopover
            values={{
              from: preset === "custom" ? from : null,
              to: preset === "custom" ? to : null,
              businessUnitId: selectedBuId,
            }}
            units={filterUnits.map((unit) => ({ id: unit.id, name: unit.name }))}
            showBuFilter={showBuFilter}
            onApply={(next) => {
              if (next.from && next.to) {
                setPreset("custom")
                setFrom(next.from)
                setTo(next.to)
              }
              setBusinessUnitId(
                next.businessUnitId == null
                  ? "all"
                  : String(next.businessUnitId)
              )
            }}
          />
        </div>
      </PageHeader>

      {section === "marketing" ? (
        <MarketingAnalyticsPanel
          data={marketingData}
          previous={marketingPrevious}
          isLoading={marketingLoading}
          campaignData={marketingCampaignData}
          campaignPrevious={marketingCampaignPrevious}
          campaignLoading={marketingCampaignLoading}
          canViewCampaigns={canViewCampaigns}
        />
      ) : isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : isEmpty ? (
        <EmptyState title="No activity in this period" />
      ) : (
        <>
          <SectionCard>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <HeroStat
                label="Revenue"
                value={kpis?.revenue_cents ?? 0}
                previous={prevKpis?.revenue_cents}
                formatValue={formatMoney}
                large
              />
              <div className="grid grid-cols-3 gap-6 sm:gap-8">
                <HeroStat
                  label="Leads"
                  value={kpis?.leads ?? 0}
                  previous={prevKpis?.leads}
                />
                <HeroStat
                  label="Converted"
                  value={kpis?.converted ?? 0}
                  previous={prevKpis?.converted}
                />
                <HeroStat
                  label="Conv %"
                  value={kpis?.conversion_rate ?? 0}
                  previous={prevKpis?.conversion_rate}
                  formatValue={(value) => `${value.toFixed(0)}%`}
                />
              </div>
            </div>
          </SectionCard>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {isHeadView
                  ? financeMode === "pnl"
                    ? "BU Owner earnings"
                    : "BU Owner cash"
                  : financeMode === "pnl"
                    ? "P&L"
                    : "Cash"}
              </h3>
              <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                    financeMode === "pnl"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setFinanceMode("pnl")}
                >
                  <Scale className="h-3.5 w-3.5" />
                  P&L
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                    financeMode === "cash"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setFinanceMode("cash")}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Cash
                </button>
              </div>
            </div>
            <SectionCard>
              <div className="space-y-4">
                {!isHeadView && kpis && kpis.revenue_cents > 0 ? (
                  <div className="space-y-2">
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="bg-destructive/70"
                        style={{ width: `${commissionShare}%` }}
                        title="Costs"
                      />
                      <div
                        className="bg-success"
                        style={{ width: `${Math.max(netShare, 0)}%` }}
                        title="Net"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-destructive/70" />
                        Costs {commissionShare.toFixed(0)}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        Net {netShare.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ) : null}

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Line
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/60">
                      <td className="py-3 text-foreground">
                        {isHeadView ? "BU revenue" : "Revenue"}
                      </td>
                      <td className="py-3 text-right">
                        <ValueWithDelta
                          value={kpis?.revenue_cents ?? 0}
                          previous={prevKpis?.revenue_cents}
                          formatValue={formatMoney}
                          valueClassName="font-medium text-foreground"
                        />
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">
                        100%
                      </td>
                    </tr>
                    {isHeadView ? (
                      <>
                        <tr className="border-b border-border/60">
                          <td className="py-3 text-foreground">Your settlement</td>
                          <td className="py-3 text-right">
                            <ValueWithDelta
                              value={costsCents}
                              previous={prevCostsCents}
                              formatValue={formatMoney}
                              valueClassName="font-medium text-foreground"
                            />
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {commissionShare.toFixed(0)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-foreground">Team commissions</td>
                          <td className="py-3 text-right">
                            <ValueWithDelta
                              value={teamCostsCents}
                              previous={prevTeamCostsCents}
                              formatValue={formatMoney}
                              valueClassName="font-medium text-foreground"
                            />
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {teamShare.toFixed(0)}%
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr className="border-b border-border/60">
                          <td className="py-3 text-foreground">Team commissions</td>
                          <td className="py-3 text-right">
                            <ValueWithDelta
                              value={teamCostsCents}
                              previous={prevTeamCostsCents}
                              formatValue={formatMoney}
                              invert
                              valueClassName="font-medium text-foreground"
                            />
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {teamShare.toFixed(0)}%
                          </td>
                        </tr>
                        <tr className="border-b border-border/60">
                          <td className="py-3 text-foreground">BU Owner settlements</td>
                          <td className="py-3 text-right">
                            <ValueWithDelta
                              value={buOwnerCostsCents}
                              previous={prevBuOwnerCostsCents}
                              formatValue={formatMoney}
                              invert
                              valueClassName="font-medium text-foreground"
                            />
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {buOwnerShare.toFixed(0)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 font-medium text-foreground">Net</td>
                          <td className="py-3 text-right">
                            <ValueWithDelta
                              value={netCents}
                              previous={prevNetCents}
                              formatValue={formatMoney}
                              valueClassName="font-semibold text-foreground"
                            />
                          </td>
                          <td className="py-3 text-right tabular-nums text-muted-foreground">
                            {netShare.toFixed(0)}%
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Revenue over time"
              subtitle={chartIsMonthly ? "By month" : "By day"}
            >
              {chartData.every((point) => point.revenue === 0) ? (
                <p className="text-sm text-muted-foreground">No sales in this period.</p>
              ) : (
                <ChartContainer
                  config={revenueChartConfig}
                  className="aspect-[2/1] w-full"
                >
                  <AreaChart
                    data={chartData}
                    margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      minTickGap={20}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      width={36}
                      tickFormatter={(value) =>
                        typeof value === "number" ? `${Math.round(value)}` : ""
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelKey="label"
                          formatter={(value) =>
                            typeof value === "number"
                              ? formatMoney(Math.round(value * 100))
                              : String(value)
                          }
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      fill="var(--color-revenue)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </SectionCard>

            <SectionCard
              title={
                isHeadView
                  ? "Your settlements over time"
                  : "Costs over time"
              }
            >
              {!commissionChartHasData ? (
                <p className="text-sm text-muted-foreground">
                  No paid or due commissions to show.
                </p>
              ) : (
                <ChartContainer
                  config={commissionChartConfig}
                  className="aspect-[2/1] w-full"
                >
                  <AreaChart
                    data={commissionChartData}
                    margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      minTickGap={16}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      width={36}
                      tickFormatter={(value) =>
                        typeof value === "number" ? `${Math.round(value)}` : ""
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_value, payload) => {
                            const row = payload?.[0]?.payload
                            if (
                              typeof row === "object" &&
                              row != null &&
                              "tooltipLabel" in row &&
                              typeof row.tooltipLabel === "string"
                            ) {
                              return row.tooltipLabel
                            }
                            return ""
                          }}
                          formatter={(value, name) => {
                            if (typeof value !== "number") return null
                            const seriesLabel =
                              name === "Due" || name === "due" ? "Due" : "Paid"
                            return `${seriesLabel}: ${formatMoney(Math.round(value * 100))}`
                          }}
                        />
                      }
                    />
                    {upcomingStartLabel ? (
                      <ReferenceLine
                        x={upcomingStartLabel}
                        stroke="var(--border)"
                        strokeDasharray="4 4"
                        label={{
                          value: "Today",
                          position: "insideTopLeft",
                          fill: "var(--muted-foreground)",
                          fontSize: 10,
                        }}
                      />
                    ) : null}
                    <Area
                      type="monotone"
                      dataKey="paid"
                      name="Paid"
                      stroke="var(--color-paid)"
                      fill="var(--color-paid)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="due"
                      name="Due"
                      stroke="var(--color-due)"
                      fill="var(--color-due)"
                      fillOpacity={0.12}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </SectionCard>
          </div>

          {showBusinessUnits ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Business units
              </h3>
              <SectionCard noPadding>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className={thClass}>Unit</th>
                      <SortableKpiHeader
                        label="Leads"
                        column="leads"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightPlainClass}
                      />
                      <SortableKpiHeader
                        label="Converted"
                        column="converted"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightPlainClass}
                      />
                      <SortableKpiHeader
                        label="Conv %"
                        column="conversion_rate"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightPlainClass}
                      />
                      <SortableKpiHeader
                        label="Revenue"
                        column="revenue_cents"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                      <SortableKpiHeader
                        label="Margin"
                        column="margin_cents"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                      <SortableKpiHeader
                        label="Share"
                        column="share"
                        sort={buSort}
                        onSort={(column) =>
                          setBuSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightPlainClass}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBusinessUnits.map((row) => {
                      const prevBu = previous?.business_units.find(
                        (unit) => unit.business_unit_id === row.business_unit_id
                      )
                      const prevBuCosts =
                        financeMode === "cash"
                          ? (prevBu?.commissions_paid_cents ?? 0)
                          : (prevBu?.commissions_cents ?? 0)
                      const prevBuMargin =
                        (prevBu?.revenue_cents ?? 0) - prevBuCosts
                      return (
                        <tr
                          key={row.business_unit_id}
                          className="hover:bg-accent/60"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {row.name}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {row.leads}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {row.converted}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {row.conversion_rate.toFixed(0)}%
                          </td>
                          <td className="px-4 py-3">
                            <ValueWithDelta
                              value={row.revenue_cents}
                              previous={prevBu?.revenue_cents}
                              formatValue={formatMoney}
                              valueClassName="text-foreground"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ValueWithDelta
                              value={row.margin_cents}
                              previous={prevBu ? prevBuMargin : undefined}
                              formatValue={formatMoney}
                              valueClassName="text-foreground"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-end gap-1">
                              <span className="tabular-nums text-foreground">
                                {row.share.toFixed(0)}%
                              </span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${Math.min(Math.max(row.share, 0), 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </SectionCard>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Team</h3>
              <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
                {(
                  [
                        ["owner", "Owners", Crown],
                    ["closer", "Closers", Handshake],
                    ["setter", "Setters", Phone],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                      roleTab === key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setRoleTab(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {memberRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No {roleTab} activity in this period.
              </p>
            ) : (
              <SectionCard noPadding>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className={thClass}>Member</th>
                      <SortableKpiHeader
                        label="Leads"
                        column="leads"
                        sort={memberSort}
                        onSort={(column) =>
                          setMemberSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                      <SortableKpiHeader
                        label="Converted"
                        column="converted"
                        sort={memberSort}
                        onSort={(column) =>
                          setMemberSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                      <SortableKpiHeader
                        label="Conv %"
                        column="conversion_rate"
                        sort={memberSort}
                        onSort={(column) =>
                          setMemberSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                      <SortableKpiHeader
                        label="Revenue"
                        column="revenue_cents"
                        sort={memberSort}
                        onSort={(column) =>
                          setMemberSort((current) => nextKpiSort(current, column))
                        }
                        className={thRightClass}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {memberRows.map((row) => (
                      <tr
                        key={`${row.role_kind}-${row.member_id}`}
                        className="hover:bg-accent/60"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.member_name}
                        </td>
                        <td className="px-4 py-3">
                          <MetricWithDelta
                            value={row.leads}
                            previous={row.prev_leads}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <MetricWithDelta
                            value={row.converted}
                            previous={row.prev_converted}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <MetricWithDelta
                            value={row.conversion_rate}
                            previous={row.prev_conversion_rate}
                            formatValue={(value) => `${value.toFixed(0)}%`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <MetricWithDelta
                            value={row.revenue_cents}
                            previous={row.prev_revenue_cents}
                            formatValue={formatMoney}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}
          </div>

          {pipeline.length > 0 ? (
            <SectionCard title="Pipeline">
              <ul className="space-y-3">
                {pipeline.map((row) => {
                  const width = Math.max((row.count / pipelineMax) * 100, 6)
                  const barColor = pipelineStatusColor(
                    row.status_key,
                    leadStatuses
                  )
                  return (
                    <li
                      key={row.status_key}
                      className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3"
                    >
                      <span className="truncate text-sm text-foreground">
                        {row.label}
                      </span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <span className="text-right text-sm tabular-nums text-foreground">
                        {row.count}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  )
}
