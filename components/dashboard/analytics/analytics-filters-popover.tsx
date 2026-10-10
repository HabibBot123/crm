"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineDateRangeValue,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"

export type AnalyticsFilterValues = {
  /** YYYY-MM-DD */
  from: string | null
  /** YYYY-MM-DD */
  to: string | null
  /** null = all units */
  businessUnitId: number | null
}

function asDateRange(
  value: unknown
): FilterRefineDateRangeValue {
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

function toRefineValues(values: AnalyticsFilterValues): FilterRefineValues {
  return {
    period: { from: values.from, to: values.to },
    business_unit:
      values.businessUnitId == null ? [] : [String(values.businessUnitId)],
  }
}

function fromRefineValues(
  values: FilterRefineValues,
  unitIds: number[]
): AnalyticsFilterValues {
  const period = asDateRange(values.period)
  const unitRaw = values.business_unit
  const selected =
    Array.isArray(unitRaw) && unitRaw.length > 0 ? unitRaw[0] : null
  const parsed = selected != null ? Number(selected) : null
  const businessUnitId =
    parsed != null && Number.isFinite(parsed) && unitIds.includes(parsed)
      ? parsed
      : null
  return {
    from: period.from,
    to: period.to,
    businessUnitId,
  }
}

export function AnalyticsFiltersPopover({
  values,
  units,
  showBuFilter,
  onApply,
}: {
  values: AnalyticsFilterValues
  units: Array<{ id: number; name: string }>
  showBuFilter: boolean
  onApply: (next: AnalyticsFilterValues) => void
}) {
  const unitIds = useMemo(() => units.map((unit) => unit.id), [units])

  const fields = useMemo<FilterRefineField[]>(() => {
    const next: FilterRefineField[] = [
      {
        id: "period",
        label: "Custom range",
        type: "date-range",
        span: 2,
      },
    ]
    if (showBuFilter) {
      next.push({
        id: "business_unit",
        label: "Business unit",
        type: "search-select",
        multiple: false,
        span: 2,
        placeholder: "All units",
        searchPlaceholder: "Search units…",
        emptyText: "No units.",
        options: units.map((unit) => ({
          value: String(unit.id),
          label: unit.name,
        })),
      })
    }
    return next
  }, [showBuFilter, units])

  return (
    <FilterRefine
      title="Refine analytics"
      fields={fields}
      values={toRefineValues(values)}
      onApply={(next) => onApply(fromRefineValues(next, unitIds))}
      triggerClassName="relative right-auto top-auto translate-y-0"
    />
  )
}
