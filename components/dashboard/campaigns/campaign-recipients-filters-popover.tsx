"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import { RECIPIENT_STATUS_CONFIGS } from "@/lib/campaigns/delivery-labels"
import type { CampaignRecipientStatus } from "@/schemas/campaign-delivery.schema"

export type CampaignRecipientsFilterValues = {
  statuses: CampaignRecipientStatus[]
}

export const emptyCampaignRecipientsFilters: CampaignRecipientsFilterValues = {
  statuses: [],
}

const STATUS_OPTIONS = (
  Object.keys(RECIPIENT_STATUS_CONFIGS) as CampaignRecipientStatus[]
).map((value) => ({
  value,
  label: RECIPIENT_STATUS_CONFIGS[value]?.label ?? value,
}))

function isRecipientStatus(value: string): value is CampaignRecipientStatus {
  return value in RECIPIENT_STATUS_CONFIGS
}

function toRefineValues(
  values: CampaignRecipientsFilterValues
): FilterRefineValues {
  return { status: values.statuses }
}

function fromRefineValues(
  values: FilterRefineValues
): CampaignRecipientsFilterValues {
  const raw = values.status
  return {
    statuses: Array.isArray(raw) ? raw.filter(isRecipientStatus) : [],
  }
}

type CampaignRecipientsFiltersPopoverProps = {
  values: CampaignRecipientsFilterValues
  onApply: (values: CampaignRecipientsFilterValues) => void
}

export function CampaignRecipientsFiltersPopover({
  values,
  onApply,
}: CampaignRecipientsFiltersPopoverProps) {
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
