"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { CampaignRecipientSheet } from "@/components/dashboard/campaigns/campaign-recipient-sheet"
import {
  CampaignRecipientsFiltersPopover,
  emptyCampaignRecipientsFilters,
  type CampaignRecipientsFilterValues,
} from "@/components/dashboard/campaigns/campaign-recipients-filters-popover"
import {
  formatDeliveryRate,
  formatShortDateTime,
  RECIPIENT_STATUS_CONFIGS,
} from "@/lib/campaigns/delivery-labels"
import { useCampaignRecipientsPage } from "@/hooks/use-campaign-delivery"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CampaignRecipientListItem } from "@/schemas/campaign-delivery.schema"
import type { CampaignDeliveryStats } from "@/schemas/campaign-delivery.schema"

const PAGE_SIZE = 25

function DeliveryKpi({
  label,
  value,
  rate,
}: {
  label: string
  value: number
  rate: string | null
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {rate ? (
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{rate}</p>
      ) : null}
    </div>
  )
}

type CampaignDeliveryViewProps = {
  organizationId: number
  campaignId: number
}

export function CampaignDeliveryView({
  organizationId,
  campaignId,
}: CampaignDeliveryViewProps) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CampaignRecipientsFilterValues>(
    emptyCampaignRecipientsFilters
  )
  const [selected, setSelected] = useState<CampaignRecipientListItem | null>(
    null
  )

  const { data, isLoading } = useCampaignRecipientsPage({
    organizationId,
    campaignId,
    page,
    pageSize: PAGE_SIZE,
    search,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
  })

  const stats: CampaignDeliveryStats | null = data?.stats ?? null
  const recipients = data?.recipients ?? []
  const total = data?.total ?? 0
  const deliveredBase = stats?.delivered ?? 0
  const hasActiveFilters = filters.statuses.length > 0
  const hasFilters = search.length > 0 || hasActiveFilters

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: CampaignRecipientsFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removeStatus(status: string) {
    applyFilters({
      statuses: filters.statuses.filter((item) => item !== status),
    })
  }

  return (
    <>
      <SectionCard title="Delivery">
        {isLoading && !stats ? (
          <LoadingRows count={2} />
        ) : stats ? (
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <DeliveryKpi label="Recipients" value={stats.recipients} rate={null} />
            <DeliveryKpi
              label="Sent"
              value={stats.sent}
              rate={formatDeliveryRate(stats.sent, stats.recipients)}
            />
            <DeliveryKpi
              label="Delivered"
              value={stats.delivered}
              rate={formatDeliveryRate(stats.delivered, stats.sent)}
            />
            <DeliveryKpi
              label="Opened"
              value={stats.opened}
              rate={formatDeliveryRate(stats.opened, deliveredBase)}
            />
            <DeliveryKpi
              label="Clicked"
              value={stats.clicked}
              rate={formatDeliveryRate(stats.clicked, deliveredBase)}
            />
          </div>
        ) : (
          <LoadingRows count={2} />
        )}
      </SectionCard>

      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-9 pr-11"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch()
            }}
            placeholder="Search by email"
          />
          <CampaignRecipientsFiltersPopover
            values={filters}
            onApply={applyFilters}
          />
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
                {RECIPIENT_STATUS_CONFIGS[value]?.label ?? value}
                <X className="h-3 w-3" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <SectionCard
        noPadding
        footer={
          total > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary page={page} pageSize={PAGE_SIZE} total={total} />
              <PaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="p-4">
            <LoadingRows count={4} />
          </div>
        ) : recipients.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={hasFilters ? "No matching recipients" : "No recipients yet"}
              description={
                hasFilters
                  ? "Try another search or clear the filters."
                  : "Recipients appear after send. Delivery events fill in via webhooks."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((recipient) => (
                  <tr
                    key={recipient.id}
                    className="cursor-pointer hover:bg-accent/60"
                    onClick={() => setSelected(recipient)}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">
                        {recipient.full_name?.trim() || recipient.email}
                      </p>
                      {recipient.full_name?.trim() ? (
                        <p className="text-xs text-muted-foreground">
                          {recipient.email}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={recipient.last_status}
                        configs={RECIPIENT_STATUS_CONFIGS}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                      {formatShortDateTime(recipient.last_status_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <CampaignRecipientSheet
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        organizationId={organizationId}
        campaignId={campaignId}
        recipient={selected}
      />
    </>
  )
}
