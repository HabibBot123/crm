"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineDateRangeValue,
  type FilterRefineField,
  type FilterRefineRangeValue,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"

export type ClientStatusFilter = "active" | "expired"

export type ClientsFilterValues = {
  statuses: ClientStatusFilter[]
  /** Major currency units (e.g. euros), not cents. */
  totalSpentMin: number | null
  /** Major currency units (e.g. euros), not cents. */
  totalSpentMax: number | null
  /** YYYY-MM-DD */
  firstJoinedFrom: string | null
  /** YYYY-MM-DD */
  firstJoinedTo: string | null
}

export const emptyClientsFilters: ClientsFilterValues = {
  statuses: [],
  totalSpentMin: null,
  totalSpentMax: null,
  firstJoinedFrom: null,
  firstJoinedTo: null,
}

const STATUS_OPTIONS: Array<{ value: ClientStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
]

function isStatusFilter(value: string): value is ClientStatusFilter {
  return value === "active" || value === "expired"
}

function asRangeValue(value: unknown): FilterRefineRangeValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { min: null, max: null }
  }
  if (!("min" in value) || !("max" in value)) {
    return { min: null, max: null }
  }
  const min = value.min
  const max = value.max
  return {
    min: typeof min === "number" && Number.isFinite(min) ? min : null,
    max: typeof max === "number" && Number.isFinite(max) ? max : null,
  }
}

function asDateRangeValue(value: unknown): FilterRefineDateRangeValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { from: null, to: null }
  }
  if (!("from" in value) || !("to" in value)) {
    return { from: null, to: null }
  }
  const from = value.from
  const to = value.to
  return {
    from: typeof from === "string" && from.length > 0 ? from : null,
    to: typeof to === "string" && to.length > 0 ? to : null,
  }
}

function toRefineValues(values: ClientsFilterValues): FilterRefineValues {
  return {
    status: values.statuses,
    totalSpent: { min: values.totalSpentMin, max: values.totalSpentMax },
    firstJoined: { from: values.firstJoinedFrom, to: values.firstJoinedTo },
  }
}

function fromRefineValues(values: FilterRefineValues): ClientsFilterValues {
  const statusRaw = values.status
  const totalSpent = asRangeValue(values.totalSpent)
  const firstJoined = asDateRangeValue(values.firstJoined)

  return {
    statuses: Array.isArray(statusRaw) ? statusRaw.filter(isStatusFilter) : [],
    totalSpentMin: totalSpent.min,
    totalSpentMax: totalSpent.max,
    firstJoinedFrom: firstJoined.from,
    firstJoinedTo: firstJoined.to,
  }
}

/** Convert major units (euros) to cents for DB filter. */
export function clientsAmountToCents(value: number | null): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined
  return Math.round(value * 100)
}

export function statusFilterLabel(status: ClientStatusFilter): string {
  if (status === "active") return "Active"
  if (status === "expired") return "Expired"
  return status
}

export function ClientsFiltersPopover({
  values,
  onApply,
}: {
  values: ClientsFilterValues
  onApply: (next: ClientsFilterValues) => void
}) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "status",
        label: "Status",
        type: "checkbox",
        span: 2,
        options: STATUS_OPTIONS,
      },
      {
        id: "totalSpent",
        label: "Total spent",
        type: "range",
        span: 2,
        min: 0,
        max: 100_000,
        step: 1,
        minPlaceholder: "Min €",
        maxPlaceholder: "Max €",
      },
      {
        id: "firstJoined",
        label: "First joined",
        type: "date-range",
        span: 2,
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
