"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type KpiSortDirection = "desc" | "asc"

export type KpiSortState<T extends string> = {
  column: T
  direction: KpiSortDirection
}

export function nextKpiSort<T extends string>(
  current: KpiSortState<T>,
  column: T
): KpiSortState<T> {
  if (current.column === column) {
    return {
      column,
      direction: current.direction === "desc" ? "asc" : "desc",
    }
  }
  return { column, direction: "desc" }
}

export function sortByKpiColumn<T>(
  rows: T[],
  column: keyof T & string,
  direction: KpiSortDirection
): T[] {
  return [...rows].sort((a, b) => {
    const left = Number(a[column] ?? 0)
    const right = Number(b[column] ?? 0)
    const cmp = left - right
    if (cmp !== 0) return direction === "asc" ? cmp : -cmp
    return 0
  })
}

type SortableKpiHeaderProps<T extends string> = {
  label: string
  column: T
  sort: KpiSortState<T>
  onSort: (column: T) => void
  className?: string
}

export function SortableKpiHeader<T extends string>({
  label,
  column,
  sort,
  onSort,
  className,
}: SortableKpiHeaderProps<T>) {
  const active = sort.column === column
  const Icon = !active
    ? ArrowUpDown
    : sort.direction === "desc"
      ? ArrowDown
      : ArrowUp

  return (
    <th className={className}>
      <button
        type="button"
        title={
          active
            ? sort.direction === "desc"
              ? "Sort low to high"
              : "Sort high to low"
            : "Sort high to low"
        }
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex w-full items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </button>
    </th>
  )
}
