"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ClipboardList,
  FileText,
  MessageCircle,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useDashboardOverview } from "@/hooks/use-dashboard-overview"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { PageHeader } from "@/components/dashboard/page-header"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"
import { Badge } from "@/components/ui/badge"
import { formatAmountFromCents, cn } from "@/lib/utils"
import type { OverviewViewerMode } from "@/schemas/dashboard-overview.schema"

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0
    return null
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function formatMoney(cents: number, currency = "EUR"): string {
  return formatAmountFromCents(cents, currency) ?? "0.00"
}

function OverviewKpi({
  label,
  value,
  previous,
}: {
  label: string
  value: string
  previous?: number | null
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {previous != null ? (
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              previous > 0
                ? "text-success"
                : previous < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}
          >
            {previous > 0 ? "+" : ""}
            {previous}%
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { currentOrganization, organizations, isLoading: orgLoading } =
    useCurrentOrganization()
  const {
    can,
    isBuOwner,
    scope,
    isLoading: capsLoading,
  } = useOrgCapabilities()
  const currentOrgId =
    currentOrganization?.id ?? organizations[0]?.id ?? null
  const { statuses: leadStatuses } = useOrganizationLeadStatuses(currentOrgId)

  const canShowOrgMode = can("analytics.view") && scope === "org"
  const canShowBuMode = isBuOwner

  const modeOptions: { key: OverviewViewerMode; label: string }[] = [
    { key: "member", label: "Member" },
  ]
  if (canShowOrgMode) {
    modeOptions.push({ key: "org", label: "Organization" })
  }
  if (canShowBuMode) {
    modeOptions.push({ key: "bu", label: "Business unit" })
  }

  const [viewerMode, setViewerMode] = useState<OverviewViewerMode>("member")

  useEffect(() => {
    if (viewerMode === "org" && !canShowOrgMode) {
      setViewerMode(canShowBuMode ? "bu" : "member")
      return
    }
    if (viewerMode === "bu" && !canShowBuMode) {
      setViewerMode(canShowOrgMode ? "org" : "member")
    }
  }, [canShowOrgMode, canShowBuMode, viewerMode])

  useEffect(() => {
    if (isLoading || orgLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (organizations.length === 0) {
      router.replace("/create-organization")
    }
  }, [user, isLoading, orgLoading, organizations.length, router])

  const effectiveMode: OverviewViewerMode = modeOptions.some(
    (option) => option.key === viewerMode
  )
    ? viewerMode
    : "member"

  const { data, isLoading: overviewLoading } = useDashboardOverview(
    currentOrgId,
    effectiveMode,
    !capsLoading && !!currentOrgId
  )

  if (isLoading || !user || orgLoading || organizations.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const fullNameMeta = user?.user_metadata?.full_name
  const firstName =
    typeof fullNameMeta === "string"
      ? fullNameMeta.trim().split(" ")[0] || null
      : null

  const kpis = data?.kpis
  const attention = data?.attention
  const isScopedView =
    effectiveMode === "org" || effectiveMode === "bu"
  const showModeSwitcher = modeOptions.length > 1

  type AttentionItem = {
    key: string
    href: string
    icon: typeof MessageCircle
    label: string
  }
  const attentionItems: AttentionItem[] = []
  if (!isScopedView && (attention?.new_coaching_assignments ?? 0) > 0) {
    const n = attention?.new_coaching_assignments ?? 0
    attentionItems.push({
      key: "new_coaching",
      href: "/dashboard/coaching",
      icon: MessageCircle,
      label:
        n === 1
          ? "Assigned to 1 new coaching"
          : `Assigned to ${n} new coachings`,
    })
  }
  if (isScopedView && (attention?.unassigned_coaching ?? 0) > 0) {
    attentionItems.push({
      key: "unassigned",
      href: "/dashboard/coaching",
      icon: MessageCircle,
      label: `${attention?.unassigned_coaching} coaching to assign`,
    })
  }
  if ((attention?.leads_new ?? 0) > 0) {
    attentionItems.push({
      key: "leads_new",
      href: "/dashboard/crm",
      icon: ClipboardList,
      label: `${attention?.leads_new} new lead${(attention?.leads_new ?? 0) === 1 ? "" : "s"}`,
    })
  }
  if ((attention?.payouts_overdue ?? 0) > 0) {
    attentionItems.push({
      key: "payouts",
      href: "/dashboard/crm/commissions",
      icon: Wallet,
      label: `${attention?.payouts_overdue} overdue payout${(attention?.payouts_overdue ?? 0) === 1 ? "" : "s"}`,
    })
  }

  const ambassadorLinks = data?.ambassador_links ?? []
  const maxLinkClicks = ambassadorLinks.reduce(
    (max, link) => (link.clicks > max ? link.clicks : max),
    0
  )

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Overview"}
        subtitle={
          currentOrganization?.name
            ? `${currentOrganization.name} · ${today}`
            : today
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Last 30 days</span>
          {showModeSwitcher ? (
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
              {modeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium transition-colors",
                    viewerMode === option.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setViewerMode(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </PageHeader>

      {capsLoading || overviewLoading || !data || !kpis || !attention ? (
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      ) : (
        <>
          {attentionItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attentionItems.map((item) => (
                <Link key={item.key} href={item.href}>
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm transition-colors hover:bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}

          <SectionCard>
            {isScopedView ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewKpi
                  label="Revenue"
                  value={formatMoney(kpis.revenue_cents)}
                  previous={pctChange(
                    kpis.revenue_cents,
                    kpis.revenue_prev_cents
                  )}
                />
                <OverviewKpi
                  label="New leads"
                  value={String(kpis.leads)}
                  previous={pctChange(kpis.leads, kpis.leads_prev)}
                />
                <OverviewKpi
                  label="Converted"
                  value={String(kpis.converted)}
                  previous={pctChange(kpis.converted, kpis.converted_prev)}
                />
                <OverviewKpi
                  label="Active clients"
                  value={String(kpis.active_clients)}
                />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <OverviewKpi
                  label="My leads"
                  value={String(kpis.my_leads)}
                  previous={pctChange(kpis.my_leads, kpis.my_leads_prev)}
                />
                <OverviewKpi
                  label="Converted"
                  value={String(kpis.my_converted)}
                  previous={pctChange(
                    kpis.my_converted,
                    kpis.my_converted_prev
                  )}
                />
                <OverviewKpi
                  label="Commissions earned"
                  value={formatMoney(kpis.commissions_earned_cents)}
                  previous={pctChange(
                    kpis.commissions_earned_cents,
                    kpis.commissions_earned_prev_cents
                  )}
                />
                <OverviewKpi
                  label="Pending payout"
                  value={formatMoney(kpis.commissions_pending_cents)}
                />
              </div>
            )}
          </SectionCard>

          {isScopedView ? (
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <SectionCard
                  title="Recent leads"
                  action={
                    <Link
                      href="/dashboard/crm"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open CRM
                    </Link>
                  }
                >
                  {data.recent_leads.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="No leads yet"
                      description="Leads will show up here."
                    />
                  ) : (
                    <ul className="space-y-1">
                      {data.recent_leads.map((lead) => {
                        const name = lead.full_name || lead.email || "Lead"
                        return (
                          <li
                            key={lead.id}
                            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                          >
                            <UserAvatar
                              name={lead.full_name}
                              email={lead.email}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {name}
                              </p>
                              {lead.email && lead.full_name ? (
                                <p className="truncate text-xs text-muted-foreground">
                                  {lead.email}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <LeadStatusBadge
                                status={lead.status}
                                catalog={leadStatuses}
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(lead.created_at).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </SectionCard>

                <div className="space-y-4">
                  <SectionCard
                    title="Top forms"
                    action={
                      <Link
                        href="/dashboard/crm/forms"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open Forms
                      </Link>
                    }
                  >
                    {data.top_forms.length === 0 ? (
                      <EmptyState
                        icon={FileText}
                        title="No form leads"
                        description="Forms with leads in the last 30 days show here."
                      />
                    ) : (
                      <ul className="space-y-3">
                        {data.top_forms.map((form, i) => (
                          <li
                            key={form.form_id}
                            className="flex items-center gap-3"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {form.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {form.leads} lead
                                {form.leads !== 1 ? "s" : ""} ·{" "}
                                {form.converted} converted · {form.clicks} click
                                {form.clicks !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Top products"
                    action={
                      <Link
                        href="/dashboard/products"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View all
                      </Link>
                    }
                  >
                    {data.top_products.length === 0 ? (
                      <EmptyState
                        icon={Package}
                        title="No enrollments yet"
                        description="Products with enrollments will appear here."
                      />
                    ) : (
                      <ul className="space-y-3">
                        {data.top_products.map((product, i) => (
                          <li
                            key={product.product_id}
                            className="flex items-center gap-3"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-muted-foreground">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {product.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.total_enrollments} enrollment
                                {product.total_enrollments !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-xs capitalize"
                            >
                              {product.type}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Recent sales"
                    action={
                      <Link
                        href="/dashboard/sales"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View all
                      </Link>
                    }
                  >
                    {data.recent_sales.length === 0 ? (
                      <EmptyState
                        icon={ShoppingCart}
                        title="No sales yet"
                        description="Purchases show up here."
                      />
                    ) : (
                      <ul className="space-y-1">
                        {data.recent_sales.map((sale) => {
                          const name =
                            sale.user_full_name || sale.buyer_email || "Unknown"
                          const dateLabel = new Date(
                            sale.created_at
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                          return (
                            <li
                              key={sale.id}
                              className="rounded-lg px-2 py-2 transition-colors hover:bg-accent"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                                  {name}
                                </p>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                  +{formatMoney(sale.amount, sale.currency)}
                                </p>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {sale.offer_title
                                  ? `${sale.offer_title} · ${dateLabel}`
                                  : dateLabel}
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
          ) : (
            <div
              className={cn(
                "grid gap-6",
                ambassadorLinks.length > 0 || data.coaching
                  ? "lg:grid-cols-[2fr_1fr]"
                  : null
              )}
            >
              <SectionCard
                title="Recent leads"
                action={
                  <Link
                    href="/dashboard/crm"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open CRM
                  </Link>
                }
              >
                {data.recent_leads.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No leads yet"
                    description="Your leads will show up here."
                  />
                ) : (
                  <ul className="space-y-1">
                    {data.recent_leads.map((lead) => {
                      const name = lead.full_name || lead.email || "Lead"
                      return (
                        <li
                          key={lead.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                        >
                          <UserAvatar
                            name={lead.full_name}
                            email={lead.email}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {name}
                            </p>
                            {lead.email && lead.full_name ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {lead.email}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <LeadStatusBadge
                              status={lead.status}
                              catalog={leadStatuses}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(lead.created_at).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </SectionCard>

              <div className="space-y-4">
                {ambassadorLinks.length > 0 ? (
                  <SectionCard
                    title="Share links"
                    action={
                      <Link
                        href="/dashboard/crm/forms"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    }
                  >
                    <ul className="space-y-3">
                      {ambassadorLinks.map((link) => {
                        const ratio =
                          maxLinkClicks > 0
                            ? link.clicks / maxLinkClicks
                            : 0
                        return (
                          <li key={link.link_id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-foreground">
                                {link.label}
                              </p>
                              <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {link.clicks} click
                                {link.clicks !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary/70"
                                style={{
                                  width: `${Math.max(ratio * 100, link.clicks > 0 ? 4 : 0)}%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {link.leads} lead
                              {link.leads !== 1 ? "s" : ""} · {link.converted}{" "}
                              converted
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </SectionCard>
                ) : null}
                {data.coaching ? (
                  <SectionCard
                    title="Coaching"
                    action={
                      <Link
                        href="/dashboard/coaching"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    }
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <OverviewKpi
                        label="Active packs"
                        value={String(data.coaching.packs_active)}
                      />
                      <OverviewKpi
                        label="Open sessions"
                        value={String(data.coaching.sessions_open)}
                      />
                    </div>
                  </SectionCard>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
