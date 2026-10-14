"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import {
  CampaignAudienceFiltersPopover,
  emptyCampaignAudienceFilters,
  type CampaignAudienceFilterValues,
} from "@/components/dashboard/campaigns/campaign-audience-filters-popover"
import { useCampaignAudienceContactsPage } from "@/hooks/use-campaign-audience"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CampaignAudienceOrigin } from "@/schemas/campaign.schema"

const PAGE_SIZE = 25

const ORIGIN_BADGE = {
  lead: { label: "Lead", variant: "default" as const },
  client: { label: "Client", variant: "success" as const },
  both: { label: "Both", variant: "warning" as const },
  unknown: { label: "Unknown", variant: "muted" as const },
}

const SYNC_BADGE = {
  synced: { label: "Synced", variant: "success" as const },
  pending: { label: "Pending", variant: "warning" as const },
}

const OPT_IN_BADGE = {
  in: { label: "Opted in", variant: "success" as const },
  out: { label: "Opted out", variant: "muted" as const },
}

const ORIGIN_FILTER_LABELS: Record<CampaignAudienceOrigin, string> = {
  lead: "Lead",
  client: "Client",
  both: "Both",
  unknown: "Unknown",
}

type CampaignAudiencePanelProps = {
  organizationId: number
  enabled: boolean
}

export function CampaignAudiencePanel({
  organizationId,
  enabled,
}: CampaignAudiencePanelProps) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CampaignAudienceFilterValues>(
    emptyCampaignAudienceFilters
  )

  const { data, isLoading } = useCampaignAudienceContactsPage({
    organizationId,
    page,
    pageSize: PAGE_SIZE,
    search,
    origins: filters.origins.length > 0 ? filters.origins : undefined,
    optIn: filters.optIn,
    synced: filters.synced,
    enabled,
  })

  const contacts = data?.items ?? []
  const total = data?.total ?? 0
  const hasOriginFilters = filters.origins.length > 0
  const hasOptInFilter = filters.optIn !== null
  const hasSyncFilter = filters.synced !== null
  const hasActiveFilters = hasOriginFilters || hasOptInFilter || hasSyncFilter
  const hasFilters = search.length > 0 || hasActiveFilters

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: CampaignAudienceFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removeOrigin(origin: CampaignAudienceOrigin) {
    applyFilters({
      ...filters,
      origins: filters.origins.filter((item) => item !== origin),
    })
  }

  return (
    <div className="space-y-4">
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
            placeholder="Search by name or email"
          />
          <CampaignAudienceFiltersPopover
            values={filters}
            onApply={applyFilters}
          />
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.origins.map((value) => (
              <Button
                key={`origin-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeOrigin(value)}
              >
                {ORIGIN_FILTER_LABELS[value]}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {hasOptInFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => applyFilters({ ...filters, optIn: null })}
              >
                {filters.optIn ? "Opted in" : "Opted out"}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
            {hasSyncFilter ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => applyFilters({ ...filters, synced: null })}
              >
                {filters.synced ? "Synced" : "Pending"}
                <X className="h-3 w-3" />
              </Button>
            ) : null}
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
        ) : contacts.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={hasFilters ? "No matching contacts" : "No contacts yet"}
              description={
                hasFilters
                  ? "Try another search or clear the filters."
                  : "Contacts appear when leads or clients opt in."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    First name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Last name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Origin
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Consent
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sync
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-accent/60">
                    <td className="px-4 py-2.5 text-foreground">
                      {contact.first_name?.trim() || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {contact.last_name?.trim() || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {contact.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={contact.origin}
                        configs={ORIGIN_BADGE}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={contact.marketing_opt_in ? "in" : "out"}
                        configs={OPT_IN_BADGE}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge
                        status={contact.synced ? "synced" : "pending"}
                        configs={SYNC_BADGE}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
