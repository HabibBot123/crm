"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  CRM_FIELD_FILTERABLE_MAX,
  isCrmFieldFilterableType,
  type CrmField,
} from "@/schemas/crm.schema"

const fieldTypeLabels: Record<CrmField["field_type"], string> = {
  text: "Short answer",
  textarea: "Long answer (paragraph)",
  select: "Single choice (dropdown)",
  multi_select: "Multiple choices",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
}

export function CrmFieldRow({
  field,
  filterableCount,
  onToggleShowInCrm,
  onToggleFilterable,
  onEdit,
  onDelete,
  isPending,
}: {
  field: CrmField
  filterableCount: number
  onToggleShowInCrm: (fieldId: number, show: boolean) => void
  onToggleFilterable: (fieldId: number, filterable: boolean) => void
  onEdit: (field: CrmField) => void
  onDelete: (fieldId: number) => void
  isPending?: boolean
}) {
  const canBeFilterable = isCrmFieldFilterableType(field.field_type)
  const filterableDisabled =
    isPending ||
    !canBeFilterable ||
    (!field.filterable && filterableCount >= CRM_FIELD_FILTERABLE_MAX)

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{field.label}</p>
        <p className="text-xs text-muted-foreground">
          Type: {fieldTypeLabels[field.field_type]}
          {!canBeFilterable ? " · not filterable" : null}
        </p>
      </div>
      <div className="ml-3 flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Show in CRM</span>
          <Switch
            checked={field.show_in_crm}
            onCheckedChange={(checked) => onToggleShowInCrm(field.id, checked)}
            disabled={isPending}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter</span>
          <Switch
            checked={field.filterable}
            onCheckedChange={(checked) => onToggleFilterable(field.id, checked)}
            disabled={filterableDisabled}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(field)}
          disabled={isPending}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(field.id)}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}
