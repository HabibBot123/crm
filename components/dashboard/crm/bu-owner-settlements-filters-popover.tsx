"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineDateRangeValue,
  type FilterRefineField,
  type FilterRefineRangeValue,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"

export type SettlementStatusFilter = "pending" | "overdue" | "paid"

export type BuOwnerSettlementsFilterValues = {
  statuses: SettlementStatusFilter[]
  /** Major currency units (e.g. euros), not cents. */
  amountMin: number | null
  amountMax: number | null
  /** YYYY-MM-DD */
  dueFrom: string | null
  dueTo: string | null
}

export const emptyBuOwnerSettlementsFilters: BuOwnerSettlementsFilterValues = {
  statuses: [],
  amountMin: null,
  amountMax: null,
  dueFrom: null,
  dueTo: null,
}

const STATUS_OPTIONS: Array<{ value: SettlementStatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
]

function isStatusFilter(value: string): value is SettlementStatusFilter {
  return value === "pending" || value === "overdue" || value === "paid"
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

function toRefineValues(values: BuOwnerSettlementsFilterValues): FilterRefineValues {
  return {
    status: values.statuses,
    amount: { min: values.amountMin, max: values.amountMax },
    due: { from: values.dueFrom, to: values.dueTo },
  }
}

function fromRefineValues(values: FilterRefineValues): BuOwnerSettlementsFilterValues {
  const statusRaw = values.status
  const amount = asRangeValue(values.amount)
  const due = asDateRangeValue(values.due)

  return {
    statuses: Array.isArray(statusRaw) ? statusRaw.filter(isStatusFilter) : [],
    amountMin: amount.min,
    amountMax: amount.max,
    dueFrom: due.from,
    dueTo: due.to,
  }
}

export function settlementsAmountToCents(value: number | null): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined
  return Math.round(value * 100)
}

export function settlementStatusFilterLabel(status: SettlementStatusFilter): string {
  if (status === "pending") return "Pending"
  if (status === "overdue") return "Overdue"
  if (status === "paid") return "Paid"
  return status
}

/** Map UI status chips to list query args (overdue is derived from due_at). */
export function resolveSettlementStatusQuery(statuses: SettlementStatusFilter[]): {
  statuses?: Array<"pending" | "paid">
  overdueOnly?: boolean
} {
  if (statuses.length === 0) return {}

  const hasPending = statuses.includes("pending")
  const hasOverdue = statuses.includes("overdue")
  const hasPaid = statuses.includes("paid")

  if (hasOverdue && !hasPending) {
    if (hasPaid) {
      return { statuses: ["pending", "paid"], overdueOnly: false }
    }
    return { statuses: ["pending"], overdueOnly: true }
  }

  const dbStatuses: Array<"pending" | "paid"> = []
  if (hasPending || hasOverdue) dbStatuses.push("pending")
  if (hasPaid) dbStatuses.push("paid")
  return { statuses: dbStatuses, overdueOnly: false }
}

export function BuOwnerSettlementsFiltersPopover({
  values,
  onApply,
}: {
  values: BuOwnerSettlementsFilterValues
  onApply: (next: BuOwnerSettlementsFilterValues) => void
}) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "status",
        label: "Status",
        type: "checkbox",
        span: 2,
        columns: 2,
        options: STATUS_OPTIONS,
      },
      {
        id: "amount",
        label: "Amount",
        type: "range",
        span: 2,
        min: 0,
        max: 100_000,
        step: 1,
        minPlaceholder: "Min €",
        maxPlaceholder: "Max €",
      },
      {
        id: "due",
        label: "Due date",
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
