"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatAmountFromCents, cn } from "@/lib/utils"
import type { CrmMarketingAnalytics } from "@/schemas/analytics.schema"

const PAGE_SIZE = 25

const thClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
const thRightClass =
  "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
/** Extra right pad matches CompactDelta slot so headers sit over the figure. */
const thRightDeltaClass =
  "whitespace-nowrap py-3 pl-4 pr-[4.25rem] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"

const linkChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatMoney(cents: number): string {
  return `${formatAmountFromCents(cents, "EUR") ?? "0.00"}`
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return null
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function CompactDelta({
  current,
  previous,
}: {
  current: number
  previous: number | undefined
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
  return (
    <span
      className={cn(
        "inline-block w-12 shrink-0 text-left text-[11px] font-medium tabular-nums",
        delta > 0 ? "text-success" : "text-destructive"
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
  large,
  align = "start",
}: {
  value: number
  previous: number | undefined
  formatValue?: (value: number) => string
  large?: boolean
  align?: "start" | "end"
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-baseline gap-1",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      <span
        className={cn(
          "tabular-nums text-foreground",
          large
            ? "font-display text-3xl font-bold tracking-tight sm:text-4xl"
            : large === false
              ? "font-display text-2xl font-bold tracking-tight"
              : null
        )}
      >
        {formatValue ? formatValue(value) : String(value)}
      </span>
      <CompactDelta current={value} previous={previous} />
    </div>
  )
}

function MetricCell({
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
      align="end"
    />
  )
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

type Props = {
  data: CrmMarketingAnalytics | null
  previous: CrmMarketingAnalytics | null
  isLoading: boolean
}

export function MarketingAnalyticsPanel({ data, previous, isLoading }: Props) {
  const [linksPage, setLinksPage] = useState(1)
  const [ambassadorsPage, setAmbassadorsPage] = useState(1)
  const [formsPage, setFormsPage] = useState(1)

  const kpis = data?.kpis
  const prevKpis = previous?.kpis

  const funnel = useMemo(() => {
    if (!kpis) return []
    const clicks = Math.max(kpis.clicks, 0)
    const leads = Math.max(kpis.leads, 0)
    const converted = Math.max(kpis.converted, 0)
    const lost = Math.max(kpis.lost, 0)
    const max = Math.max(clicks, leads, converted, lost, 1)
    return [
      {
        key: "clicks",
        label: "Clicks",
        value: clicks,
        width: (clicks / max) * 100,
        hint: "Lifetime",
        color: "var(--primary)",
      },
      {
        key: "leads",
        label: "Leads",
        value: leads,
        width: (leads / max) * 100,
        rate:
          clicks > 0 ? `${((leads / clicks) * 100).toFixed(0)}% of clicks` : null,
        color: "#3B82F6",
      },
      {
        key: "lost",
        label: "Lost",
        value: lost,
        width: (lost / max) * 100,
        rate:
          leads > 0 ? `${((lost / leads) * 100).toFixed(0)}% of leads` : null,
        color: "#EF4444",
      },
      {
        key: "converted",
        label: "Converted",
        value: converted,
        width: (converted / max) * 100,
        rate:
          leads > 0
            ? `${((converted / leads) * 100).toFixed(0)}% of leads`
            : null,
        color: "#22C55E",
      },
    ]
  }, [kpis])

  const linkChartData = useMemo(() => {
    const rows = data?.links ?? []
    return [...rows]
      .sort((a, b) => b.revenue_cents - a.revenue_cents || b.leads - a.leads)
      .slice(0, 8)
      .map((row) => ({
        link_id: row.link_id,
        label: row.label,
        member_name: row.member_name,
        form_title: row.form_title,
        revenue: row.revenue_cents / 100,
        leads: row.leads,
      }))
  }, [data?.links])

  const links = data?.links ?? []
  const ambassadors = data?.ambassadors ?? []
  const forms = data?.forms ?? []

  const prevLinksById = useMemo(() => {
    const map = new Map<number, (typeof links)[number]>()
    for (const row of previous?.links ?? []) map.set(row.link_id, row)
    return map
  }, [previous?.links])

  const prevAmbassadorsById = useMemo(() => {
    const map = new Map<number, (typeof ambassadors)[number]>()
    for (const row of previous?.ambassadors ?? []) map.set(row.member_id, row)
    return map
  }, [previous?.ambassadors])

  const prevFormsById = useMemo(() => {
    const map = new Map<number, (typeof forms)[number]>()
    for (const row of previous?.forms ?? []) map.set(row.form_id, row)
    return map
  }, [previous?.forms])

  if (isLoading) {
    return (
      <SectionCard>
        <LoadingRows count={6} />
      </SectionCard>
    )
  }

  const isEmpty =
    !!data &&
    data.kpis.leads === 0 &&
    data.kpis.revenue_cents === 0 &&
    data.links.length === 0

  if (isEmpty || !data || !kpis) {
    return <EmptyState title="No marketing activity in this period" />
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Revenue
            </p>
            <div className="mt-1">
              <ValueWithDelta
                value={kpis.revenue_cents}
                previous={prevKpis?.revenue_cents}
                formatValue={formatMoney}
                large
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <HeroStat
              label="Clicks"
              value={kpis.clicks}
              previous={undefined}
              hint="Lifetime"
            />
            <HeroStat
              label="Leads"
              value={kpis.leads}
              previous={prevKpis?.leads}
            />
            <HeroStat
              label="Converted"
              value={kpis.converted}
              previous={prevKpis?.converted}
            />
            <HeroStat
              label="Conv %"
              value={kpis.conversion_rate}
              previous={prevKpis?.conversion_rate}
              formatValue={(value) => `${value.toFixed(0)}%`}
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Funnel">
          <ul className="space-y-3">
            {funnel.map((step) => (
              <li key={step.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {step.label}
                    </span>
                    {step.hint ? (
                      <span className="text-xs text-muted-foreground">
                        {step.hint}
                      </span>
                    ) : null}
                    {step.rate ? (
                      <span className="text-xs text-muted-foreground">
                        {step.rate}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {step.value}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(step.width, step.value > 0 ? 4 : 0)}%`,
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        {linkChartData.length > 0 ? (
          <SectionCard
            title="Revenue by share link"
            subtitle="Top 8 this period"
          >
            <ChartContainer
              config={linkChartConfig}
              className="aspect-[2/1] w-full"
            >
              <BarChart
                data={linkChartData}
                margin={{ left: 4, right: 4, top: 4, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  interval={0}
                  tickFormatter={(value) =>
                    typeof value === "string" && value.length > 12
                      ? `${value.slice(0, 12)}…`
                      : String(value)
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  width={40}
                  tickFormatter={(value) =>
                    typeof value === "number" ? `${Math.round(value)}` : ""
                  }
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload
                    if (!row) return null
                    return (
                      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-foreground">{row.label}</p>
                        <p className="mt-1 text-muted-foreground">
                          Member: {row.member_name}
                        </p>
                        <p className="text-muted-foreground">
                          Form: {row.form_title}
                        </p>
                        <p className="mt-1.5 tabular-nums text-foreground">
                          {formatMoney(Math.round(row.revenue * 100))}
                          <span className="text-muted-foreground">
                            {" "}
                            · {row.leads} leads
                          </span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--color-revenue)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </SectionCard>
        ) : (
          <SectionCard title="Revenue by share link">
            <p className="text-sm text-muted-foreground">
              No share link revenue in this period.
            </p>
          </SectionCard>
        )}
      </div>

      {links.length > 0 ? (
        <PaginatedTable
          title="Share links"
          page={linksPage}
          pageSize={PAGE_SIZE}
          total={links.length}
          onPageChange={setLinksPage}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className={thClass}>Link</th>
                <th className={thClass}>Member</th>
                <th className={thClass}>Form</th>
                <th className={thRightClass}>Clicks</th>
                <th className={thRightDeltaClass}>Leads</th>
                <th className={thRightDeltaClass}>Converted</th>
                <th className={thRightDeltaClass}>Conv %</th>
                <th className={thRightDeltaClass}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {paginate(links, linksPage, PAGE_SIZE).map((row) => {
                const prior = prevLinksById.get(row.link_id)
                return (
                  <tr key={row.link_id} className="hover:bg-accent/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {row.member_name}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {row.form_title}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.clicks}
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell value={row.leads} previous={prior?.leads ?? 0} />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.converted}
                        previous={prior?.converted ?? 0}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.conversion_rate}
                        previous={prior?.conversion_rate ?? 0}
                        formatValue={(value) => `${value.toFixed(0)}%`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.revenue_cents}
                        previous={prior?.revenue_cents ?? 0}
                        formatValue={formatMoney}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </PaginatedTable>
      ) : null}

      {ambassadors.length > 0 ? (
        <PaginatedTable
          title="Ambassadors"
          page={ambassadorsPage}
          pageSize={PAGE_SIZE}
          total={ambassadors.length}
          onPageChange={setAmbassadorsPage}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className={thClass}>Member</th>
                <th className={thRightClass}>Links</th>
                <th className={thRightDeltaClass}>Leads</th>
                <th className={thRightDeltaClass}>Conv %</th>
                <th className={thRightDeltaClass}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {paginate(ambassadors, ambassadorsPage, PAGE_SIZE).map((row) => {
                const prior = prevAmbassadorsById.get(row.member_id)
                return (
                  <tr key={row.member_id} className="hover:bg-accent/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.member_name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.links}
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.leads}
                        previous={prior?.leads ?? 0}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.conversion_rate}
                        previous={prior?.conversion_rate ?? 0}
                        formatValue={(value) => `${value.toFixed(0)}%`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.revenue_cents}
                        previous={prior?.revenue_cents ?? 0}
                        formatValue={formatMoney}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </PaginatedTable>
      ) : null}

      {forms.length > 0 ? (
        <PaginatedTable
          title="Forms"
          page={formsPage}
          pageSize={PAGE_SIZE}
          total={forms.length}
          onPageChange={setFormsPage}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className={thClass}>Form</th>
                <th className={thRightDeltaClass}>Leads</th>
                <th className={thRightDeltaClass}>Conv %</th>
                <th className={thRightDeltaClass}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {paginate(forms, formsPage, PAGE_SIZE).map((row) => {
                const prior = prevFormsById.get(row.form_id)
                return (
                  <tr key={row.form_id} className="hover:bg-accent/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.form_title}
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.leads}
                        previous={prior?.leads ?? 0}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.conversion_rate}
                        previous={prior?.conversion_rate ?? 0}
                        formatValue={(value) => `${value.toFixed(0)}%`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MetricCell
                        value={row.revenue_cents}
                        previous={prior?.revenue_cents ?? 0}
                        formatValue={formatMoney}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </PaginatedTable>
      ) : null}
    </div>
  )
}

function HeroStat({
  label,
  value,
  previous,
  formatValue,
  hint,
}: {
  label: string
  value: number
  previous: number | undefined
  formatValue?: (value: number) => string
  hint?: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {hint ? (
          <span className="ml-1 font-normal normal-case tracking-normal">
            ({hint})
          </span>
        ) : null}
      </p>
      <div className="mt-1">
        <ValueWithDelta
          value={value}
          previous={previous}
          formatValue={formatValue}
          large={false}
        />
      </div>
    </div>
  )
}

function PaginatedTable({
  title,
  page,
  pageSize,
  total,
  onPageChange,
  children,
}: {
  title: string
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <SectionCard
        noPadding
        footer={
          total > pageSize ? (
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary
                page={page}
                pageSize={pageSize}
                total={total}
              />
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={onPageChange}
              />
            </div>
          ) : undefined
        }
      >
        {children}
      </SectionCard>
    </div>
  )
}
