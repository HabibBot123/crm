"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchSelect } from "@/components/ui/search-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  flattenCampaignSegmentFilter,
  type CampaignSegmentCondition,
  type CampaignSegmentFilterGroup,
} from "@/schemas/campaign-segment.schema"

type StatusOption = { key: string; label: string }
type NamedOption = { id: number; name: string }
type FieldOption = {
  id: number
  label: string
  options: Array<{ value: string; label: string }> | null
}

const CONDITION_TYPES: Array<{ value: CampaignSegmentCondition["type"]; label: string }> = [
  { value: "lead_status", label: "Lead status" },
  { value: "lead_origin", label: "Lead origin" },
  { value: "form_field", label: "Form field" },
  { value: "is_client", label: "Is client" },
  { value: "offer", label: "Offer purchased" },
  { value: "product", label: "Product purchased" },
  { value: "business_unit", label: "Business unit" },
  { value: "lead_created_at", label: "Lead created date" },
  { value: "enrollment_created_at", label: "Enrollment date" },
]

function defaultCondition(type: CampaignSegmentCondition["type"]): CampaignSegmentCondition {
  switch (type) {
    case "lead_status":
      return { type, op: "in", values: [] }
    case "lead_origin":
      return { type, op: "in", values: ["form"] }
    case "form_field":
      return { type, field_def_id: 0, op: "in", values: [] }
    case "is_client":
      return { type, op: "eq", value: true }
    case "offer":
    case "product":
    case "business_unit":
      return { type, op: "in", values: [] }
    case "lead_created_at":
    case "enrollment_created_at":
      return { type, op: "on_or_after", from: undefined, to: undefined }
  }
}

function isCondition(
  node: CampaignSegmentFilterGroup["conditions"][number]
): node is CampaignSegmentCondition {
  return "type" in node
}

export function SegmentFilterBuilder({
  value,
  onChange,
  statuses,
  fields,
  offers,
  products,
  units,
}: {
  value: CampaignSegmentFilterGroup
  onChange: (next: CampaignSegmentFilterGroup) => void
  statuses: StatusOption[]
  fields: FieldOption[]
  offers: NamedOption[]
  products: NamedOption[]
  units: NamedOption[]
}) {
  const group = flattenCampaignSegmentFilter(value)
  const conditions = group.conditions.filter(isCondition)

  function commit(next: CampaignSegmentFilterGroup) {
    onChange({
      op: next.op,
      conditions: next.conditions.filter(isCondition),
    })
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Conditions</p>
        <Select
          value={group.op}
          onValueChange={(op) => {
            if (op === "and" || op === "or") commit({ ...group, op })
          }}
        >
          <SelectTrigger className="h-8 w-[8.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">Match all</SelectItem>
            <SelectItem value="or">Match any</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {conditions.length > 0 ? (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={`${index}-${condition.type}`}
              condition={condition}
              statuses={statuses}
              fields={fields}
              offers={offers}
              products={products}
              units={units}
              onChange={(next) => {
                commit({
                  ...group,
                  conditions: conditions.map((item, i) => (i === index ? next : item)),
                })
              }}
              onRemove={() => {
                commit({
                  ...group,
                  conditions: conditions.filter((_, i) => i !== index),
                })
              }}
            />
          ))}
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          commit({
            ...group,
            conditions: [...conditions, defaultCondition("lead_status")],
          })
        }
      >
        <Plus />
        Add condition
      </Button>
    </div>
  )
}

function ConditionRow({
  condition,
  statuses,
  fields,
  offers,
  products,
  units,
  onChange,
  onRemove,
}: {
  condition: CampaignSegmentCondition
  statuses: StatusOption[]
  fields: FieldOption[]
  offers: NamedOption[]
  products: NamedOption[]
  units: NamedOption[]
  onChange: (next: CampaignSegmentCondition) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
      <SearchSelect
        className="w-[12.5rem] shrink-0"
        placeholder="Condition"
        searchPlaceholder="Search conditions…"
        options={CONDITION_TYPES.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
        value={condition.type}
        onValueChange={(type) => {
          const match = CONDITION_TYPES.find((item) => item.value === type)
          if (!match) return
          onChange(defaultCondition(match.value))
        }}
      />

      {condition.type === "lead_status" && (
        <>
          <ListOpSelect
            value={condition.op}
            onChange={(op) => onChange({ ...condition, op })}
          />
          <SearchSelect
            multiple
            className="min-w-[12rem] flex-1"
            placeholder="Select statuses"
            options={statuses.map((status) => ({
              value: status.key,
              label: status.label,
            }))}
            value={condition.values}
            onValueChange={(values) => onChange({ ...condition, values })}
          />
        </>
      )}

      {condition.type === "lead_origin" && (
        <>
          <ListOpSelect
            value={condition.op}
            onChange={(op) => onChange({ ...condition, op })}
          />
          <SearchSelect
            multiple
            className="min-w-[10rem] flex-1"
            placeholder="Select origins"
            options={[
              { value: "form", label: "Form" },
              { value: "manual", label: "Manual" },
            ]}
            value={condition.values}
            onValueChange={(values) => onChange({ ...condition, values })}
          />
        </>
      )}

      {condition.type === "is_client" && (
        <>
          <Select value="eq" disabled>
            <SelectTrigger className="w-[5rem] shrink-0">
              <SelectValue>is</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eq">is</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={condition.value ? "yes" : "no"}
            onValueChange={(value) =>
              onChange({ ...condition, value: value === "yes" })
            }
          >
            <SelectTrigger className="w-[6rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {condition.type === "form_field" && (
        <>
          <SearchSelect
            className="w-[12rem] shrink-0"
            placeholder="Field"
            searchPlaceholder="Search fields…"
            options={fields.map((field) => ({
              value: String(field.id),
              label: field.label,
            }))}
            value={
              condition.field_def_id > 0 ? String(condition.field_def_id) : ""
            }
            onValueChange={(value) =>
              onChange({
                ...condition,
                field_def_id: Number(value),
                values: [],
              })
            }
          />
          <Select
            value={condition.op}
            onValueChange={(op) => {
              if (
                op === "in" ||
                op === "not_in" ||
                op === "exists" ||
                op === "not_exists"
              ) {
                onChange({ ...condition, op })
              }
            }}
          >
            <SelectTrigger className="w-[8.5rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in">is any of</SelectItem>
              <SelectItem value="not_in">is none of</SelectItem>
              <SelectItem value="exists">has value</SelectItem>
              <SelectItem value="not_exists">is empty</SelectItem>
            </SelectContent>
          </Select>
          {(condition.op === "in" || condition.op === "not_in") && (
            <SearchSelect
              multiple
              className="min-w-[12rem] flex-1"
              placeholder="Select values"
              options={
                fields
                  .find((field) => field.id === condition.field_def_id)
                  ?.options?.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })) ?? []
              }
              value={condition.values ?? []}
              onValueChange={(values) => onChange({ ...condition, values })}
            />
          )}
        </>
      )}

      {(condition.type === "offer" ||
        condition.type === "product" ||
        condition.type === "business_unit") && (
        <>
          <ListOpSelect
            value={condition.op}
            onChange={(op) => onChange({ ...condition, op })}
          />
          <SearchSelect
            multiple
            className="min-w-[12rem] flex-1"
            placeholder={
              condition.type === "offer"
                ? "Select offers"
                : condition.type === "product"
                  ? "Select products"
                  : "Select units"
            }
            options={(condition.type === "offer"
              ? offers
              : condition.type === "product"
                ? products
                : units
            ).map((option) => ({
              value: String(option.id),
              label: option.name,
            }))}
            value={condition.values.map(String)}
            onValueChange={(values) =>
              onChange({
                ...condition,
                values: values.map(Number).filter((id) => Number.isFinite(id)),
              })
            }
          />
        </>
      )}

      {(condition.type === "lead_created_at" ||
        condition.type === "enrollment_created_at") && (
        <>
          <Select
            value={condition.op}
            onValueChange={(op) => {
              if (
                op === "before" ||
                op === "after" ||
                op === "between" ||
                op === "on_or_after" ||
                op === "on_or_before"
              ) {
                onChange({ ...condition, op })
              }
            }}
          >
            <SelectTrigger className="w-[8.5rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on_or_after">On or after</SelectItem>
              <SelectItem value="on_or_before">On or before</SelectItem>
              <SelectItem value="between">Between</SelectItem>
              <SelectItem value="after">After</SelectItem>
              <SelectItem value="before">Before</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
            {(condition.op === "on_or_after" ||
              condition.op === "after" ||
              condition.op === "between") && (
              <Input
                type="date"
                className="w-[9.5rem] shrink-0"
                value={condition.from ?? ""}
                onChange={(event) =>
                  onChange({
                    ...condition,
                    from: event.target.value || undefined,
                  })
                }
              />
            )}
            {condition.op === "between" && (
              <span className="shrink-0 text-sm text-muted-foreground">to</span>
            )}
            {(condition.op === "on_or_before" ||
              condition.op === "before" ||
              condition.op === "between") && (
              <Input
                type="date"
                className="w-[9.5rem] shrink-0"
                value={condition.to ?? ""}
                onChange={(event) =>
                  onChange({
                    ...condition,
                    to: event.target.value || undefined,
                  })
                }
              />
            )}
          </div>
        </>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="ml-auto shrink-0"
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function ListOpSelect({
  value,
  onChange,
}: {
  value: "in" | "not_in"
  onChange: (op: "in" | "not_in") => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(op) => {
        if (op === "in" || op === "not_in") onChange(op)
      }}
    >
      <SelectTrigger className="w-[8.5rem] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="in">is any of</SelectItem>
        <SelectItem value="not_in">is none of</SelectItem>
      </SelectContent>
    </Select>
  )
}
