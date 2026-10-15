"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import type { OrgAccessOrigin } from "@/schemas/community.schema"

export type OrgMembersFilterValues = {
  origins: OrgAccessOrigin[]
}

export const emptyOrgMembersFilters: OrgMembersFilterValues = {
  origins: [],
}

const ORIGIN_OPTIONS: Array<{ value: OrgAccessOrigin; label: string }> = [
  { value: "staff", label: "Staff" },
  { value: "enrollment", label: "Enrollment" },
  { value: "community", label: "Community" },
]

function isOrigin(value: string): value is OrgAccessOrigin {
  return value === "staff" || value === "enrollment" || value === "community"
}

function toRefineValues(values: OrgMembersFilterValues): FilterRefineValues {
  return { origin: values.origins }
}

function fromRefineValues(values: FilterRefineValues): OrgMembersFilterValues {
  const raw = values.origin
  return {
    origins: Array.isArray(raw) ? raw.filter(isOrigin) : [],
  }
}

export function originFilterLabel(origin: OrgAccessOrigin): string {
  if (origin === "staff") return "Staff"
  if (origin === "enrollment") return "Enrollment"
  return "Community"
}

export function OrgMembersFiltersPopover({
  values,
  onApply,
}: {
  values: OrgMembersFilterValues
  onApply: (next: OrgMembersFilterValues) => void
}) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "origin",
        label: "Origin",
        type: "checkbox",
        span: 2,
        options: ORIGIN_OPTIONS,
      },
    ],
    []
  )

  return (
    <FilterRefine
      title="Refine results"
      fields={fields}
      values={toRefineValues(values)}
      onApply={(next) => onApply(fromRefineValues(next))}
    />
  )
}
