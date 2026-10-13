"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { SegmentFilterBuilder } from "@/components/dashboard/campaigns/segment-filter-builder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
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

export default function CampaignsPage() {
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

  const { statuses } = useOrganizationLeadStatuses(canManage ? organizationId : null)
  const { fields } = useCrmFields(canManage ? organizationId : null)
  const { offers } = useOffers(canManage ? organizationId : null)
  const { data: productsPage } = useProducts(canManage ? organizationId : null, 1, 100)
  const { units } = useBusinessUnits(canManage ? organizationId : null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CampaignSegment | null>(null)
  const [name, setName] = useState("")
  const [filterJson, setFilterJson] = useState<CampaignSegmentFilterGroup>(
    emptyCampaignSegmentFilter()
  )

  function openCreate() {
    setEditing(null)
    setName("")
    setFilterJson(emptyCampaignSegmentFilter())
    setEditorOpen(true)
  }

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
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Campaigns" />
        <NoAccessState />
      </div>
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

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Campaigns">
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
      </PageHeader>

      <SectionCard title="Audience">
        {statsLoading ? (
          <LoadingRows count={2} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-3">
              <AudienceKpi label="Opted in" value={String(stats?.opted_in ?? 0)} />
              <AudienceKpi label="Synced" value={String(stats?.synced ?? 0)} />
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
          />
        ) : (
          <ul className="divide-y divide-border">
            {segments.map((segment) => (
              <li
                key={segment.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{segment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const n = countCampaignSegmentConditions(segment.filter_json)
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
                      if (window.confirm(`Delete segment "${segment.name}"?`)) {
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit segment" : "New segment"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                filterable: field.filterable,
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
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
