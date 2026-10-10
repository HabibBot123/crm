"use client"

import { useMemo } from "react"
import {
  FilterRefine,
  type FilterRefineField,
  type FilterRefineValues,
} from "@/components/dashboard/filter-refine"
import type { CrmField, LeadStatus, OrganizationLeadStatus } from "@/schemas/crm.schema"

export type CrmFilterValues = {
  statuses: LeadStatus[]
  origins: Array<"form" | "manual">
  memberIds: number[]
  businessUnitIds: number[]
  /** fieldDefId → selected option values */
  fieldFilters: Record<string, string[]>
}

type MemberOption = {
  memberId: number
  fullName: string | null
}

type BusinessUnitOption = {
  id: number
  name: string
}

export const emptyCrmFilters: CrmFilterValues = {
  statuses: [],
  origins: [],
  memberIds: [],
  businessUnitIds: [],
  fieldFilters: {},
}

const ORIGIN_OPTIONS: Array<{ value: "form" | "manual"; label: string }> = [
  { value: "form", label: "Form" },
  { value: "manual", label: "Manual" },
]

function isLeadOrigin(value: string): value is "form" | "manual" {
  return value === "form" || value === "manual"
}

function fieldFilterId(fieldDefId: number): string {
  return `field_${fieldDefId}`
}

function parseFieldFilterId(id: string): number | null {
  if (!id.startsWith("field_")) return null
  const parsed = Number(id.slice("field_".length))
  return Number.isFinite(parsed) ? parsed : null
}

function fieldFilterOptions(field: CrmField): Array<{ value: string; label: string }> {
  if (field.field_type === "boolean") {
    return [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ]
  }
  return (field.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))
}

function toRefineValues(
  values: CrmFilterValues,
  filterableFields: CrmField[]
): FilterRefineValues {
  const next: FilterRefineValues = {
    status: values.statuses,
    origin: values.origins,
    members: values.memberIds.map(String),
    businessUnits: values.businessUnitIds.map(String),
  }
  for (const field of filterableFields) {
    next[fieldFilterId(field.id)] = values.fieldFilters[String(field.id)] ?? []
  }
  return next
}

function fromRefineValues(
  values: FilterRefineValues,
  allowedStatusKeys: Set<string>,
  filterableFields: CrmField[]
): CrmFilterValues {
  const statusRaw = values.status
  const originRaw = values.origin
  const membersRaw = values.members
  const businessUnitsRaw = values.businessUnits
  const fieldFilters: Record<string, string[]> = {}

  for (const field of filterableFields) {
    const raw = values[fieldFilterId(field.id)]
    const allowed = new Set(fieldFilterOptions(field).map((option) => option.value))
    if (!Array.isArray(raw)) continue
    const selected = raw.filter((value) => allowed.has(value))
    if (selected.length > 0) {
      fieldFilters[String(field.id)] = selected
    }
  }

  return {
    statuses: Array.isArray(statusRaw)
      ? statusRaw.filter((value) => allowedStatusKeys.has(value))
      : [],
    origins: Array.isArray(originRaw) ? originRaw.filter(isLeadOrigin) : [],
    memberIds: Array.isArray(membersRaw)
      ? membersRaw
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [],
    businessUnitIds: Array.isArray(businessUnitsRaw)
      ? businessUnitsRaw
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : [],
    fieldFilters,
  }
}

export function CrmFiltersPopover({
  values,
  leadStatuses,
  members,
  businessUnits,
  filterableFields,
  showBusinessUnitFilter,
  onApply,
}: {
  values: CrmFilterValues
  leadStatuses: OrganizationLeadStatus[]
  members: MemberOption[]
  businessUnits: BusinessUnitOption[]
  filterableFields: CrmField[]
  showBusinessUnitFilter: boolean
  onApply: (next: CrmFilterValues) => void
}) {
  const allowedStatusKeys = useMemo(
    () => new Set(leadStatuses.map((status) => status.key)),
    [leadStatuses]
  )

  const fields = useMemo<FilterRefineField[]>(() => {
    const next: FilterRefineField[] = [
      {
        id: "origin",
        label: "Origin",
        type: "checkbox",
        span: 2,
        columns: 2,
        options: ORIGIN_OPTIONS,
      },
      {
        id: "status",
        label: "Status",
        type: "search-select",
        span: 2,
        multiple: true,
        placeholder: "Select statuses…",
        searchPlaceholder: "Search statuses…",
        emptyText: "No status found.",
        options: leadStatuses.map((status) => ({
          value: status.key,
          label: status.label,
        })),
      },
      {
        id: "members",
        label: "Team members",
        type: "search-select",
        span: 2,
        multiple: true,
        placeholder: "Select members…",
        searchPlaceholder: "Search members…",
        emptyText: "No member found.",
        options: members.map((member) => ({
          value: String(member.memberId),
          label: member.fullName?.trim() || `Member #${member.memberId}`,
        })),
      },
    ]

    if (showBusinessUnitFilter) {
      next.push({
        id: "businessUnits",
        label: "Business units",
        type: "search-select",
        span: 2,
        multiple: true,
        placeholder: "Select business units…",
        searchPlaceholder: "Search business units…",
        emptyText: "No business unit found.",
        options: businessUnits.map((unit) => ({
          value: String(unit.id),
          label: unit.name,
        })),
      })
    }

    for (const field of filterableFields) {
      const options = fieldFilterOptions(field)
      if (options.length === 0) continue
      if (field.field_type === "boolean") {
        next.push({
          id: fieldFilterId(field.id),
          label: field.label,
          type: "checkbox",
          span: 2,
          columns: 2,
          options,
        })
        continue
      }
      next.push({
        id: fieldFilterId(field.id),
        label: field.label,
        type: "search-select",
        span: 2,
        multiple: true,
        placeholder: `Select ${field.label.toLowerCase()}…`,
        searchPlaceholder: `Search ${field.label.toLowerCase()}…`,
        emptyText: "No option found.",
        options,
      })
    }

    return next
  }, [
    leadStatuses,
    members,
    businessUnits,
    filterableFields,
    showBusinessUnitFilter,
  ])

  return (
    <FilterRefine
      title="Refine results"
      fields={fields}
      values={toRefineValues(values, filterableFields)}
      onApply={(next) =>
        onApply(fromRefineValues(next, allowedStatusKeys, filterableFields))
      }
    />
  )
}

export { fieldFilterOptions }
