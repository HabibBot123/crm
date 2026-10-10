"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { SectionCard } from "@/components/dashboard/section-card"
import { CrmFieldRow } from "@/components/dashboard/crm/crm-field-row"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useCreateCrmField, useCrmFields, useDeleteCrmField, useUpdateCrmField } from "@/hooks/use-crm-fields"
import { CRM_FIELD_FILTERABLE_MAX, type CrmField } from "@/schemas/crm.schema"

const fieldTypeOptions: CrmField["field_type"][] = [
  "text",
  "textarea",
  "select",
  "multi_select",
  "number",
  "date",
  "boolean",
]

const fieldTypeLabels: Record<CrmField["field_type"], string> = {
  text: "Short answer",
  textarea: "Long answer (paragraph)",
  select: "Single choice (dropdown)",
  multi_select: "Multiple choices",
  number: "Number",
  date: "Date",
  boolean: "Yes / No",
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function isFieldType(value: string): value is CrmField["field_type"] {
  return fieldTypeOptions.includes(value as unknown as CrmField["field_type"])
}

export function CrmFieldsPanel({ organizationId }: { organizationId: number }) {
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [label, setLabel] = useState("")
  const [question, setQuestion] = useState("")
  const [type, setType] = useState<CrmField["field_type"]>("text")
  const [optionsInput, setOptionsInput] = useState("")

  const { fields, isLoading } = useCrmFields(organizationId)
  const createField = useCreateCrmField(organizationId)
  const updateField = useUpdateCrmField(organizationId)
  const deleteField = useDeleteCrmField(organizationId)

  const nextPosition = useMemo(() => {
    if (fields.length === 0) return 0
    return Math.max(...fields.map((field) => field.position)) + 1
  }, [fields])

  const filterableCount = useMemo(
    () => fields.filter((field) => field.filterable).length,
    [fields]
  )

  const isChoiceType = type === "select" || type === "multi_select"
  const parsedOptions = optionsInput
    .split(",")
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
  const canSubmit = !createField.isPending && !!label.trim() && (!isChoiceType || parsedOptions.length > 0)
  const isEditing = editingFieldId !== null

  return (
    <div className="space-y-4">
      <SectionCard
        title={isEditing ? "Edit field" : "Add field"}
        subtitle={
          isEditing
            ? "Update an existing field."
            : "Create custom fields for forms and the CRM table."
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Field label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            placeholder="Question shown to client (optional)"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Select
            value={type}
            onValueChange={(value) => {
              if (isFieldType(value)) setType(value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldTypeOptions.map((fieldType) => (
                <SelectItem key={fieldType} value={fieldType}>
                  {fieldTypeLabels[fieldType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isChoiceType ? (
            <Input
              className="md:col-span-2"
              placeholder="Options (comma-separated): Beginner, Intermediate, Advanced"
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
            />
          ) : null}
          <div className="md:col-span-2 flex justify-end gap-2">
            {isEditing ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingFieldId(null)
                  setLabel("")
                  setQuestion("")
                  setType("text")
                  setOptionsInput("")
                }}
              >
                Cancel edit
              </Button>
            ) : null}
            <Button
              className="gap-2"
              onClick={async () => {
                const nextLabel = label.trim()
                if (!nextLabel) return
                if (isChoiceType && parsedOptions.length === 0) {
                  toast.error("Options required", {
                    description: "Add at least one option for choice fields.",
                  })
                  return
                }
                try {
                  if (isEditing && editingFieldId) {
                    await updateField.mutateAsync({
                      fieldId: editingFieldId,
                      label: nextLabel,
                      clientQuestion: question.trim() || nextLabel,
                      options: isChoiceType
                        ? parsedOptions.map((value) => ({ value: slugify(value), label: value }))
                        : null,
                    })
                  } else {
                    await createField.mutateAsync({
                      key: slugify(nextLabel),
                      label: nextLabel,
                      clientQuestion: question.trim() || nextLabel,
                      fieldType: type,
                      options: isChoiceType
                        ? parsedOptions.map((value) => ({ value: slugify(value), label: value }))
                        : null,
                      showInCrm: true,
                      isRequired: false,
                      position: nextPosition,
                    })
                  }
                  setEditingFieldId(null)
                  setLabel("")
                  setQuestion("")
                  setOptionsInput("")
                } catch (err) {
                  toast.error("Could not save field", {
                    description: err instanceof Error ? err.message : "Unexpected error",
                  })
                }
              }}
              disabled={!canSubmit}
            >
              <Plus className="h-4 w-4" />
              {isEditing ? "Update field" : "Add field"}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Fields"
        subtitle={`Toggle CRM table visibility and filters (max ${CRM_FIELD_FILTERABLE_MAX} filterable: select / multi-select / yes-no).`}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading fields...</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fields yet.</p>
        ) : (
          <ul className="space-y-2">
            {fields
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((field) => (
                <CrmFieldRow
                  key={field.id}
                  field={field}
                  filterableCount={filterableCount}
                  isPending={updateField.isPending || deleteField.isPending}
                  onEdit={(nextField) => {
                    setEditingFieldId(nextField.id)
                    setLabel(nextField.label)
                    setQuestion(nextField.client_question)
                    setType(nextField.field_type)
                    const options = Array.isArray(nextField.options)
                      ? nextField.options.map((item) => item.label).join(", ")
                      : ""
                    setOptionsInput(options)
                  }}
                  onToggleShowInCrm={(fieldId, show) => {
                    updateField.mutate({ fieldId, showInCrm: show })
                  }}
                  onToggleFilterable={(fieldId, filterable) => {
                    updateField.mutate(
                      { fieldId, filterable },
                      {
                        onError: (err) => {
                          toast.error("Could not update filter setting", {
                            description:
                              err instanceof Error ? err.message : "Unexpected error",
                          })
                        },
                      }
                    )
                  }}
                  onDelete={(fieldId) => {
                    deleteField.mutate(fieldId)
                  }}
                />
              ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
