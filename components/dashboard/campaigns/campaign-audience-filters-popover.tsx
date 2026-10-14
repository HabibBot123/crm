"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import {
  campaignAudienceOriginSchema,
  type CampaignAudienceOrigin,
} from "@/schemas/campaign.schema"

export type CampaignAudienceFilterValues = {
  origins: CampaignAudienceOrigin[]
  optIn: boolean | null
  synced: boolean | null
}

export const emptyCampaignAudienceFilters: CampaignAudienceFilterValues = {
  origins: [],
  optIn: null,
  synced: null,
}

const ORIGIN_OPTIONS: { value: CampaignAudienceOrigin; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "client", label: "Client" },
  { value: "both", label: "Both" },
]

const OPT_IN_OPTIONS = [
  { value: "true", label: "Opted in" },
  { value: "false", label: "Opted out" },
]

const SYNC_OPTIONS = [
  { value: "true", label: "Synced" },
  { value: "false", label: "Pending" },
]

function isOrigin(value: string): value is CampaignAudienceOrigin {
  return campaignAudienceOriginSchema.safeParse(value).success
}

function toRefineValues(
  values: CampaignAudienceFilterValues
): FilterRefineValues {
  return {
    origin: values.origins,
    opt_in:
      values.optIn === true
        ? ["true"]
        : values.optIn === false
          ? ["false"]
          : [],
    synced:
      values.synced === true
        ? ["true"]
        : values.synced === false
          ? ["false"]
          : [],
  }
}

function singleFlag(raw: unknown): boolean | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (raw.includes("true") && !raw.includes("false")) return true
  if (raw.includes("false") && !raw.includes("true")) return false
  return null
}

function fromRefineValues(
  values: FilterRefineValues
): CampaignAudienceFilterValues {
  const rawOrigins = values.origin
  return {
    origins: Array.isArray(rawOrigins) ? rawOrigins.filter(isOrigin) : [],
    optIn: singleFlag(values.opt_in),
    synced: singleFlag(values.synced),
  }
}

type CampaignAudienceFiltersPopoverProps = {
  values: CampaignAudienceFilterValues
  onApply: (values: CampaignAudienceFilterValues) => void
}

export function CampaignAudienceFiltersPopover({
  values,
  onApply,
}: CampaignAudienceFiltersPopoverProps) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "origin",
        label: "Origin",
        type: "checkbox",
        options: ORIGIN_OPTIONS,
        columns: 2,
        span: 2,
      },
      {
        id: "opt_in",
        label: "Consent",
        type: "checkbox",
        options: OPT_IN_OPTIONS,
        columns: 2,
      },
      {
        id: "synced",
        label: "Sync",
        type: "checkbox",
        options: SYNC_OPTIONS,
        columns: 2,
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
