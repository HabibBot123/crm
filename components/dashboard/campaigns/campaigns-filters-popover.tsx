"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import { CAMPAIGN_STATUS_CONFIGS } from "@/lib/campaigns/delivery-labels"
import type { CampaignStatus } from "@/schemas/marketing-campaign.schema"

export type CampaignsFilterValues = {
  statuses: CampaignStatus[]
}

export const emptyCampaignsFilters: CampaignsFilterValues = {
  statuses: [],
}

const STATUS_OPTIONS = (
  Object.keys(CAMPAIGN_STATUS_CONFIGS) as CampaignStatus[]
).map((value) => ({
  value,
  label: CAMPAIGN_STATUS_CONFIGS[value]?.label ?? value,
}))

function isCampaignStatus(value: string): value is CampaignStatus {
  return value in CAMPAIGN_STATUS_CONFIGS
}

function toRefineValues(values: CampaignsFilterValues): FilterRefineValues {
  return { status: values.statuses }
}

function fromRefineValues(values: FilterRefineValues): CampaignsFilterValues {
  const raw = values.status
  return {
    statuses: Array.isArray(raw) ? raw.filter(isCampaignStatus) : [],
  }
}

type CampaignsFiltersPopoverProps = {
  values: CampaignsFilterValues
  onApply: (values: CampaignsFilterValues) => void
}

export function CampaignsFiltersPopover({
  values,
  onApply,
}: CampaignsFiltersPopoverProps) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "status",
        label: "Status",
        type: "checkbox",
        options: STATUS_OPTIONS,
        columns: 2,
        span: 2,
      },
    ],
    []
  )

  return (
    <FilterRefine
      fields={fields}
      values={toRefineValues(values)}
      onApply={(next) => onApply(fromRefineValues(next))}
    />
  )
}
