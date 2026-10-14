"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  CircleHelp,
  Copy,
  Eye,
  Layers,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { SegmentFilterBuilder } from "@/components/dashboard/campaigns/segment-filter-builder"
import {
  CampaignsFiltersPopover,
  emptyCampaignsFilters,
  type CampaignsFilterValues,
} from "@/components/dashboard/campaigns/campaigns-filters-popover"
import { CampaignAudiencePanel } from "@/components/dashboard/campaigns/campaign-audience-panel"
import { CampaignHowItWorksDialog } from "@/components/dashboard/campaigns/campaign-how-it-works-dialog"
import {
  CAMPAIGN_STATUS_CONFIGS,
  formatDeliveryRate,
  formatShortDateTime,
} from "@/lib/campaigns/delivery-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useCampaignAudienceStats,
  useSyncCampaignAudience,
} from "@/hooks/use-campaign-audience"
import {
  useCampaignSegments,
  useCreateCampaignSegment,
  useDeleteCampaignSegment,
  usePreviewCampaignSegment,
  useUpdateCampaignSegment,
} from "@/hooks/use-campaign-segments"
import {
  useCampaignEmailTemplates,
  useDeleteCampaignEmailTemplate,
} from "@/hooks/use-campaign-email-templates"
import {
  useCancelCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  useCampaignsPage,
} from "@/hooks/use-campaigns"
import type { MarketingCampaign } from "@/schemas/marketing-campaign.schema"
import { useCampaignDeliveryStats } from "@/hooks/use-campaign-delivery"
import { useSendingDomain } from "@/hooks/use-sending-domain"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { useCrmFields } from "@/hooks/use-crm-fields"
import { useOffers } from "@/hooks/use-offers"
import { useProducts } from "@/hooks/use-products"
import { useBusinessUnits } from "@/hooks/use-business-units"
import {
  countCampaignSegmentConditions,
  emptyCampaignSegmentFilter,
  flattenCampaignSegmentFilter,
  type CampaignSegment,
  type CampaignSegmentFilterGroup,
} from "@/schemas/campaign-segment.schema"
import type { CampaignDeliveryStats } from "@/schemas/campaign-delivery.schema"

const HUB_TABS = ["campaigns", "library", "audience"] as const
type HubTab = (typeof HUB_TABS)[number]
const CAMPAIGNS_PAGE_SIZE = 25

function isHubTab(value: string | null): value is HubTab {
  return HUB_TABS.some((tab) => tab === value)
}

function resolveHubTab(value: string | null): HubTab {
  if (value === "templates") return "library"
  if (isHubTab(value)) return value
  return "campaigns"
}

function AudienceKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  )
}

function HubStatCell({
  count,
  rate,
}: {
  count: number | undefined
  rate: string | null
}) {
  if (count == null) {
    return <span className="text-muted-foreground">-</span>
  }
  return (
    <div className="inline-flex w-full items-baseline justify-end gap-1">
      <span className="tabular-nums text-foreground">{count}</span>
      {rate ? (
        <span className="inline-block w-12 shrink-0 text-left text-[11px] tabular-nums text-muted-foreground">
          {rate}
        </span>
      ) : (
        <span className="inline-block w-12 shrink-0" aria-hidden />
      )}
    </div>
  )
}

/** Right-aligned metrics; extra pr so the title sits above the count (rate is w-12). */
const metricThClass =
  "py-2.5 pl-4 pr-[4.25rem] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
const metricTdClass = "px-4 py-2.5 text-right"

function CampaignRowActions({
  campaign,
  cancelPending,
  duplicatePending,
  deletePending,
  onCancel,
  onDuplicate,
  onDelete,
}: {
  campaign: MarketingCampaign
  cancelPending: boolean
  duplicatePending: boolean
  deletePending: boolean
  onCancel: (campaign: MarketingCampaign) => void
  onDuplicate: (campaign: MarketingCampaign) => void
  onDelete: (campaign: MarketingCampaign) => void
}) {
  const href = `/dashboard/campaigns/${campaign.id}`
  const isDraft = campaign.status === "draft"
  const isScheduled = campaign.status === "scheduled"
  const canCancel =
    campaign.status === "scheduled" || campaign.status === "sending"
  const openLabel = isDraft || isScheduled ? "Edit campaign" : "Access campaign"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem asChild>
          <Link href={href} className="gap-2">
            {isDraft || isScheduled ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {openLabel}
          </Link>
        </DropdownMenuItem>
        {canCancel ? (
          <DropdownMenuItem
            className="gap-2"
            disabled={cancelPending}
            onClick={() => onCancel(campaign)}
          >
            Cancel campaign
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="gap-2"
          disabled={duplicatePending}
          onClick={() => onDuplicate(campaign)}
        >
          <Copy className="h-4 w-4" />
          Duplicate campaign
        </DropdownMenuItem>
        {isDraft ? (
          <DropdownMenuItem
            variant="destructive"
            className="gap-2"
            disabled={deletePending}
            onClick={() => onDelete(campaign)}
          >
            <Trash2 className="h-4 w-4" />
            Delete campaign
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function CampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab: HubTab = resolveHubTab(tabParam)

  const { currentOrganization } = useCurrentOrganization()
  const organizationId = currentOrganization?.id ?? null
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManage = can("campaigns.manage")

  const { data: stats, isLoading: statsLoading } =
    useCampaignAudienceStats(canManage ? organizationId : null)
  const syncAudience = useSyncCampaignAudience(organizationId)
  const { domain, isLoading: domainLoading } = useSendingDomain(
    canManage ? organizationId : null
  )
  const { data: segments, isLoading: segmentsLoading } = useCampaignSegments(
    canManage ? organizationId : null
  )
  const createSegment = useCreateCampaignSegment(organizationId)
  const updateSegment = useUpdateCampaignSegment(organizationId)
  const deleteSegment = useDeleteCampaignSegment(organizationId)
  const previewSegment = usePreviewCampaignSegment(organizationId)

  const { data: templates, isLoading: templatesLoading } =
    useCampaignEmailTemplates(canManage ? organizationId : null)
  const deleteTemplate = useDeleteCampaignEmailTemplate(organizationId)

  const [campaignsPage, setCampaignsPage] = useState(1)
  const [campaignSearchInput, setCampaignSearchInput] = useState("")
  const [campaignSearch, setCampaignSearch] = useState("")
  const [campaignFilters, setCampaignFilters] = useState<CampaignsFilterValues>(
    emptyCampaignsFilters
  )

  const { data: campaignsData, isLoading: campaignsLoading } =
    useCampaignsPage({
      organizationId: canManage ? organizationId : null,
      page: campaignsPage,
      pageSize: CAMPAIGNS_PAGE_SIZE,
      search: campaignSearch,
      statuses:
        campaignFilters.statuses.length > 0
          ? campaignFilters.statuses
          : undefined,
    })
  const campaigns = campaignsData?.items ?? []
  const campaignsTotal = campaignsData?.total ?? 0
  const cancelCampaign = useCancelCampaign(organizationId)
  const deleteCampaign = useDeleteCampaign(organizationId)
  const duplicateCampaign = useDuplicateCampaign(organizationId)
  const { data: deliveryStats } = useCampaignDeliveryStats(
    canManage ? organizationId : null
  )

  const statsByCampaign = useMemo(() => {
    const map = new Map<number, CampaignDeliveryStats>()
    for (const row of deliveryStats ?? []) {
      map.set(row.campaign_id, row)
    }
    return map
  }, [deliveryStats])

  const { statuses } = useOrganizationLeadStatuses(canManage ? organizationId : null)
  const { fields } = useCrmFields(canManage ? organizationId : null)
  const { offers } = useOffers(canManage ? organizationId : null)
  const { data: productsPage } = useProducts(canManage ? organizationId : null, 1, 100)
  const { units } = useBusinessUnits(canManage ? organizationId : null)

  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CampaignSegment | null>(null)
  const [name, setName] = useState("")
  const [filterJson, setFilterJson] = useState<CampaignSegmentFilterGroup>(
    emptyCampaignSegmentFilter()
  )

  const hasCampaignStatusFilters = campaignFilters.statuses.length > 0
  const hasCampaignFilters =
    campaignSearch.length > 0 || hasCampaignStatusFilters

  function applyCampaignSearch() {
    setCampaignSearch(campaignSearchInput.trim())
    setCampaignsPage(1)
  }

  function applyCampaignFilters(next: CampaignsFilterValues) {
    setCampaignFilters(next)
    setCampaignsPage(1)
  }

  function removeCampaignStatus(status: string) {
    applyCampaignFilters({
      statuses: campaignFilters.statuses.filter((item) => item !== status),
    })
  }

  function setTab(tab: HubTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "campaigns") params.delete("tab")
    else params.set("tab", tab)
    const query = params.toString()
    router.replace(query ? `/dashboard/campaigns?${query}` : "/dashboard/campaigns")
  }

  function openCreate() {
    setEditing(null)
    setName("")
    setFilterJson(emptyCampaignSegmentFilter())
    setEditorOpen(true)
  }

  function goCreateSegment() {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "library")
    params.set("newSegment", "1")
    router.replace(`/dashboard/campaigns?${params.toString()}`)
  }

  useEffect(() => {
    if (searchParams.get("newSegment") !== "1") return
    openCreate()
    const params = new URLSearchParams(searchParams.toString())
    params.delete("newSegment")
    if (params.get("tab") !== "library") params.set("tab", "library")
    const query = params.toString()
    router.replace(query ? `/dashboard/campaigns?${query}` : "/dashboard/campaigns")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from query flag
  }, [searchParams.get("newSegment")])

  function openEdit(segment: CampaignSegment) {
    setEditing(segment)
    setName(segment.name)
    setFilterJson(flattenCampaignSegmentFilter(segment.filter_json))
    setEditorOpen(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing) {
      await updateSegment.mutateAsync({
        segmentId: editing.id,
        name: trimmed,
        filter_json: filterJson,
      })
    } else {
      await createSegment.mutateAsync({
        name: trimmed,
        filter_json: filterJson,
      })
    }
    setEditorOpen(false)
  }

  if (capsLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Campaigns" />
        <LoadingRows count={3} />
      </div>
    )
  }

  if (!canManage) {
    return (
      <NoAccessState
        title="Campaigns"
        description="You don't have permission to manage campaigns with your role."
      />
    )
  }

  const domainReady = domain != null && domain.status === "verified"
  const syncDisabled = syncAudience.isPending || domainLoading || !domainReady

  let audienceHint: ReactNode = null
  if (!domain) {
    audienceHint = (
      <>
        Add a sending domain in{" "}
        <Link href="/dashboard/settings?section=email" className="underline">
          Settings
        </Link>{" "}
        before syncing.
      </>
    )
  } else if (!domainReady) {
    audienceHint = (
      <>
        Verify your sending domain in{" "}
        <Link href="/dashboard/settings?section=email" className="underline">
          Settings
        </Link>{" "}
        before syncing.
      </>
    )
  } else if ((stats?.pending ?? 0) === 0) {
    audienceHint =
      "All opted-in contacts are synced. Sync also refreshes segment membership."
  } else {
    audienceHint = `${stats?.pending} contact${stats?.pending === 1 ? "" : "s"} pending. Sync updates contacts and segments.`
  }

  const hubTabs = [
    ["campaigns", "Campaigns", Megaphone],
    ["audience", "Audience", Users],
    ["library", "Library", Layers],
  ] as const

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Campaigns"
        titleAside={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 text-muted-foreground"
            aria-label="How campaigns work"
            onClick={() => setHowItWorksOpen(true)}
          >
            <CircleHelp />
          </Button>
        }
      >
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:justify-end">
          {activeTab === "audience" ? (
            <Button
              type="button"
              disabled={syncDisabled}
              onClick={() => syncAudience.mutate()}
            >
              <RefreshCw
                className={syncAudience.isPending ? "animate-spin" : undefined}
              />
              {syncAudience.isPending ? "Syncing…" : "Sync audience"}
            </Button>
          ) : activeTab === "library" ? null : !segments?.length ? (
            <Button type="button" onClick={goCreateSegment}>
              <Plus />
              New segment
            </Button>
          ) : (
            <Button type="button" asChild>
              <Link href="/dashboard/campaigns/new">
                <Plus />
                New campaign
              </Link>
            </Button>
          )}
          <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
            {hubTabs.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                  activeTab === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setTab(key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {activeTab === "campaigns" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-full pl-9 pr-11"
                value={campaignSearchInput}
                onChange={(event) => setCampaignSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyCampaignSearch()
                }}
                placeholder="Search by name or subject"
              />
              <CampaignsFiltersPopover
                values={campaignFilters}
                onApply={applyCampaignFilters}
              />
            </div>
            {hasCampaignStatusFilters ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {campaignFilters.statuses.map((value) => (
                  <Button
                    key={`campaign-status-${value}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => removeCampaignStatus(value)}
                  >
                    {CAMPAIGN_STATUS_CONFIGS[value]?.label ?? value}
                    <X className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {campaignsLoading ? (
            <LoadingRows count={4} />
          ) : campaigns.length === 0 ? (
            <EmptyState
              title={
                hasCampaignFilters
                  ? "No matching campaigns"
                  : !segments?.length
                    ? "Create a segment first"
                    : "No campaigns yet"
              }
              description={
                hasCampaignFilters
                  ? "Try another search or clear the filters."
                  : !segments?.length
                    ? "Campaigns need a segment to target leads and clients."
                    : "Create a campaign from a segment and template."
              }
              action={
                hasCampaignFilters ? undefined : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {!segments?.length ? (
                      <Button type="button" onClick={goCreateSegment}>
                        <Plus />
                        New segment
                      </Button>
                    ) : (
                      <Button type="button" asChild>
                        <Link href="/dashboard/campaigns/new">
                          <Plus />
                          New campaign
                        </Link>
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setHowItWorksOpen(true)}
                    >
                      <CircleHelp />
                      How it works
                    </Button>
                  </div>
                )
              }
            />
          ) : (
            <SectionCard
              noPadding
              footer={
                <div className="flex items-center justify-between gap-2">
                  <PaginationSummary
                    page={campaignsPage}
                    pageSize={CAMPAIGNS_PAGE_SIZE}
                    total={campaignsTotal}
                  />
                  <PaginationControls
                    page={campaignsPage}
                    pageSize={CAMPAIGNS_PAGE_SIZE}
                    total={campaignsTotal}
                    onPageChange={setCampaignsPage}
                  />
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Name
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className={metricThClass}>Sent</th>
                      <th className={metricThClass}>Delivered</th>
                      <th className={metricThClass}>Opened</th>
                      <th className={metricThClass}>Clicked</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => {
                      const rowStats = statsByCampaign.get(campaign.id)
                      const showStats = campaign.status === "sent"
                      const deliveredBase = rowStats?.delivered ?? 0
                      return (
                        <tr
                          key={campaign.id}
                          className="cursor-pointer hover:bg-accent/60"
                          onClick={() =>
                            router.push(`/dashboard/campaigns/${campaign.id}`)
                          }
                        >
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-foreground">
                              {campaign.name}
                            </p>
                            {campaign.scheduled_at ? (
                              <p className="text-xs text-muted-foreground">
                                {formatShortDateTime(campaign.scheduled_at)}
                              </p>
                            ) : campaign.sent_at ? (
                              <p className="text-xs text-muted-foreground">
                                {formatShortDateTime(campaign.sent_at)}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge
                              status={campaign.status}
                              configs={CAMPAIGN_STATUS_CONFIGS}
                            />
                          </td>
                          <td className={metricTdClass}>
                            {showStats ? (
                              <HubStatCell
                                count={rowStats?.sent}
                                rate={
                                  rowStats
                                    ? formatDeliveryRate(
                                        rowStats.sent,
                                        rowStats.recipients
                                      )
                                    : null
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className={metricTdClass}>
                            {showStats ? (
                              <HubStatCell
                                count={rowStats?.delivered}
                                rate={
                                  rowStats
                                    ? formatDeliveryRate(
                                        rowStats.delivered,
                                        rowStats.sent
                                      )
                                    : null
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className={metricTdClass}>
                            {showStats ? (
                              <HubStatCell
                                count={rowStats?.opened}
                                rate={
                                  rowStats
                                    ? formatDeliveryRate(
                                        rowStats.opened,
                                        deliveredBase
                                      )
                                    : null
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className={metricTdClass}>
                            {showStats ? (
                              <HubStatCell
                                count={rowStats?.clicked}
                                rate={
                                  rowStats
                                    ? formatDeliveryRate(
                                        rowStats.clicked,
                                        deliveredBase
                                      )
                                    : null
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <CampaignRowActions
                              campaign={campaign}
                              cancelPending={cancelCampaign.isPending}
                              duplicatePending={duplicateCampaign.isPending}
                              deletePending={deleteCampaign.isPending}
                              onCancel={(item) => {
                                if (
                                  !window.confirm(
                                    `Cancel campaign "${item.name}"?`
                                  )
                                ) {
                                  return
                                }
                                cancelCampaign.mutate(item.id)
                              }}
                              onDuplicate={(item) => {
                                duplicateCampaign.mutate(item.id, {
                                  onSuccess: (created) => {
                                    router.push(
                                      `/dashboard/campaigns/${created.id}`
                                    )
                                  },
                                })
                              }}
                              onDelete={(item) => {
                                if (
                                  !window.confirm(
                                    `Delete campaign "${item.name}"?`
                                  )
                                ) {
                                  return
                                }
                                deleteCampaign.mutate(item.id)
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      ) : null}

      {activeTab === "library" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Segments"
            action={
              <Button type="button" variant="outline" onClick={openCreate}>
                <Plus />
                New segment
              </Button>
            }
          >
            {segmentsLoading ? (
              <LoadingRows count={3} />
            ) : !segments || segments.length === 0 ? (
              <EmptyState
                title="No segments yet"
                description="Create a filter to target leads and clients."
                action={
                  <Button type="button" onClick={openCreate}>
                    <Plus />
                    New segment
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {segments.map((segment) => (
                  <li
                    key={segment.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {segment.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          const n = countCampaignSegmentConditions(
                            segment.filter_json
                          )
                          return `${n} condition${n === 1 ? "" : "s"}`
                        })()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(segment)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deleteSegment.isPending}
                        onClick={() => {
                          if (
                            window.confirm(`Delete segment "${segment.name}"?`)
                          ) {
                            deleteSegment.mutate(segment.id)
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Templates"
            action={
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/campaigns/templates/new">
                  <Plus />
                  New template
                </Link>
              </Button>
            }
          >
            {templatesLoading ? (
              <LoadingRows count={3} />
            ) : !templates || templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                description="Create a reusable email template."
                action={
                  <Button type="button" asChild>
                    <Link href="/dashboard/campaigns/templates/new">
                      <Plus />
                      New template
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {template.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {template.subject || "No subject"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" asChild>
                        <Link
                          href={`/dashboard/campaigns/templates/${template.id}`}
                          aria-label={`Edit ${template.name}`}
                        >
                          <Pencil />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deleteTemplate.isPending}
                        onClick={() => {
                          if (
                            window.confirm(`Delete template "${template.name}"?`)
                          ) {
                            deleteTemplate.mutate(template.id)
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "audience" ? (
        <div className="space-y-4">
          <SectionCard title="Audience">
            {statsLoading ? (
              <LoadingRows count={2} />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-6 sm:grid-cols-3">
                  <AudienceKpi
                    label="Opted in"
                    value={String(stats?.opted_in ?? 0)}
                  />
                  <AudienceKpi
                    label="Synced"
                    value={String(stats?.synced ?? 0)}
                  />
                  <AudienceKpi
                    label="Pending sync"
                    value={String(stats?.pending ?? 0)}
                  />
                </div>
                {audienceHint ? (
                  <p className="text-sm text-muted-foreground">{audienceHint}</p>
                ) : null}
              </div>
            )}
          </SectionCard>
          {organizationId ? (
            <CampaignAudiencePanel
              organizationId={organizationId}
              enabled={canManage && activeTab === "audience"}
            />
          ) : null}
        </div>
      ) : null}

      <CampaignHowItWorksDialog
        open={howItWorksOpen}
        onOpenChange={setHowItWorksOpen}
      />

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pb-0">
            <DialogTitle>{editing ? "Edit segment" : "New segment"}</DialogTitle>
            <DialogDescription>
              Filter leads and clients for campaigns.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. New leads"
              />
            </div>
            <SegmentFilterBuilder
              value={filterJson}
              onChange={setFilterJson}
              statuses={statuses.map((status) => ({
                key: status.key,
                label: status.label,
              }))}
              fields={fields.map((field) => ({
                id: field.id,
                label: field.label,
                options: field.options ?? null,
              }))}
              offers={offers.map((offer) => ({
                id: offer.id,
                name: offer.title,
              }))}
              products={productsPage.items.map((product) => ({
                id: product.id,
                name: product.title,
              }))}
              units={units.map((unit) => ({
                id: unit.id,
                name: unit.name,
              }))}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {previewSegment.isPending
                  ? "Counting…"
                  : previewSegment.data
                    ? `${previewSegment.data.total} contacts (${previewSegment.data.synced} synced)`
                    : "Run preview to count matching contacts."}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={previewSegment.isPending}
                onClick={() => previewSegment.mutate(filterJson)}
              >
                <Eye />
                Preview
              </Button>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !name.trim() ||
                createSegment.isPending ||
                updateSegment.isPending
              }
              onClick={() => {
                void handleSave()
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
