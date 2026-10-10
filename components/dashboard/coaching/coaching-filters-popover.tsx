"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import type {
  CoachingPackAssignmentFilter,
  CoachingPackEnrollmentStatus,
} from "@/lib/services/coaching"

export type CoachingFilterValues = {
  assignmentFilters: CoachingPackAssignmentFilter[]
  enrollmentStatuses: CoachingPackEnrollmentStatus[]
}

export const emptyCoachingFilters: CoachingFilterValues = {
  assignmentFilters: [],
  enrollmentStatuses: [],
}

const ASSIGNMENT_OPTIONS: Array<{
  value: CoachingPackAssignmentFilter
  label: string
}> = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "waiting_signup", label: "Waiting signup" },
]

const STATUS_OPTIONS: Array<{
  value: CoachingPackEnrollmentStatus
  label: string
}> = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
]

function isAssignmentFilter(value: string): value is CoachingPackAssignmentFilter {
  return (
    value === "unassigned" || value === "assigned" || value === "waiting_signup"
  )
}

function isEnrollmentStatus(value: string): value is CoachingPackEnrollmentStatus {
  return (
    value === "active" ||
    value === "paused" ||
    value === "expired" ||
    value === "cancelled"
  )
}

function toRefineValues(values: CoachingFilterValues): FilterRefineValues {
  return {
    assignment: values.assignmentFilters,
    status: values.enrollmentStatuses,
  }
}

function fromRefineValues(values: FilterRefineValues): CoachingFilterValues {
  const assignmentRaw = values.assignment
  const statusRaw = values.status
  return {
    assignmentFilters: Array.isArray(assignmentRaw)
      ? assignmentRaw.filter(isAssignmentFilter)
      : [],
    enrollmentStatuses: Array.isArray(statusRaw)
      ? statusRaw.filter(isEnrollmentStatus)
      : [],
  }
}

export function assignmentFilterLabel(value: CoachingPackAssignmentFilter): string {
  return ASSIGNMENT_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function enrollmentStatusLabel(value: CoachingPackEnrollmentStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export function CoachingFiltersPopover({
  values,
  onApply,
}: {
  values: CoachingFilterValues
  onApply: (next: CoachingFilterValues) => void
}) {
  const fields = useMemo<FilterRefineField[]>(
    () => [
      {
        id: "assignment",
        label: "Coach",
        type: "checkbox",
        span: 1,
        options: ASSIGNMENT_OPTIONS,
      },
      {
        id: "status",
        label: "Enrollment",
        type: "checkbox",
        span: 1,
        options: STATUS_OPTIONS,
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
