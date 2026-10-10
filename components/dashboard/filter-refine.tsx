"use client"

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { ListFilter } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { SearchSelect } from "@/components/ui/search-select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type FilterRefineOption = {
  value: string
  label: string
}

type FilterRefineFieldBase = {
  id: string
  label: string
  /** Grid span in the 2-column layout. Default: 1 for checkbox, 2 for others. */
  span?: 1 | 2
}

export type FilterRefineCheckboxField = FilterRefineFieldBase & {
  type: "checkbox"
  options: FilterRefineOption[]
  /** Columns inside this checkbox group. Default 1. */
  columns?: 1 | 2
}

export type FilterRefineSearchSelectField = FilterRefineFieldBase & {
  type: "search-select"
  options: FilterRefineOption[]
  /** Multi-select (default true). */
  multiple?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
}

export type FilterRefineRangeField = FilterRefineFieldBase & {
  type: "range"
  min: number
  max: number
  step?: number
  minPlaceholder?: string
  maxPlaceholder?: string
  formatLabel?: (value: number) => string
}

export type FilterRefineDateRangeField = FilterRefineFieldBase & {
  type: "date-range"
  fromPlaceholder?: string
  toPlaceholder?: string
}

export type FilterRefineField =
  | FilterRefineCheckboxField
  | FilterRefineSearchSelectField
  | FilterRefineRangeField
  | FilterRefineDateRangeField

export type FilterRefineRangeValue = {
  min: number | null
  max: number | null
}

export type FilterRefineDateRangeValue = {
  from: string | null
  to: string | null
}

export type FilterRefineValues = Record<
  string,
  string[] | FilterRefineRangeValue | FilterRefineDateRangeValue
>

export function emptyFilterRefineValues(fields: FilterRefineField[]): FilterRefineValues {
  const values: FilterRefineValues = {}
  for (const field of fields) {
    if (field.type === "range") {
      values[field.id] = { min: null, max: null }
    } else if (field.type === "date-range") {
      values[field.id] = { from: null, to: null }
    } else {
      values[field.id] = []
    }
  }
  return values
}

export function countFilterRefineValues(
  fields: FilterRefineField[],
  values: FilterRefineValues
): number {
  let count = 0
  for (const field of fields) {
    const value = values[field.id]
    if (field.type === "range") {
      if (!value || Array.isArray(value) || !("min" in value)) continue
      if (value.min != null) count += 1
      if (value.max != null) count += 1
      continue
    }
    if (field.type === "date-range") {
      if (!value || Array.isArray(value) || !("from" in value)) continue
      if (value.from != null && value.from !== "") count += 1
      if (value.to != null && value.to !== "") count += 1
      continue
    }
    if (Array.isArray(value)) count += value.length
  }
  return count
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function asStringList(
  value: string[] | FilterRefineRangeValue | FilterRefineDateRangeValue | undefined
): string[] {
  return Array.isArray(value) ? value : []
}

function asRangeValue(
  value: string[] | FilterRefineRangeValue | FilterRefineDateRangeValue | undefined
): FilterRefineRangeValue {
  if (!value || Array.isArray(value) || !("min" in value)) return { min: null, max: null }
  return value
}

function asDateRangeValue(
  value: string[] | FilterRefineRangeValue | FilterRefineDateRangeValue | undefined
): FilterRefineDateRangeValue {
  if (!value || Array.isArray(value) || !("from" in value)) return { from: null, to: null }
  return value
}

function CheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: () => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-foreground hover:bg-accent/60"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={() => onCheckedChange()}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </label>
  )
}

function RangeField({
  field,
  value,
  onChange,
}: {
  field: FilterRefineRangeField
  value: FilterRefineRangeValue
  onChange: (next: FilterRefineRangeValue) => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Min</p>
          <Input
            type="number"
            className="h-8"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            placeholder={field.minPlaceholder ?? String(field.min)}
            value={value.min ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                ...value,
                min: raw === "" ? null : Number(raw),
              })
            }}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Max</p>
          <Input
            type="number"
            className="h-8"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            placeholder={field.maxPlaceholder ?? String(field.max)}
            value={value.max ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                ...value,
                max: raw === "" ? null : Number(raw),
              })
            }}
          />
        </div>
      </div>
      {field.formatLabel ? (
        <p className="text-[11px] text-muted-foreground">
          Range {field.formatLabel(field.min)} – {field.formatLabel(field.max)}
        </p>
      ) : null}
    </div>
  )
}

function DateRangeField({
  field,
  value,
  onChange,
}: {
  field: FilterRefineDateRangeField
  value: FilterRefineDateRangeValue
  onChange: (next: FilterRefineDateRangeValue) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">From</p>
        <Input
          type="date"
          className="h-8"
          placeholder={field.fromPlaceholder}
          value={value.from ?? ""}
          onChange={(event) => {
            const raw = event.target.value
            onChange({
              ...value,
              from: raw === "" ? null : raw,
            })
          }}
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">To</p>
        <Input
          type="date"
          className="h-8"
          placeholder={field.toPlaceholder}
          value={value.to ?? ""}
          onChange={(event) => {
            const raw = event.target.value
            onChange({
              ...value,
              to: raw === "" ? null : raw,
            })
          }}
        />
      </div>
    </div>
  )
}

function FilterFieldsBody({
  fields,
  draft,
  setDraft,
}: {
  fields: FilterRefineField[]
  draft: FilterRefineValues
  setDraft: Dispatch<SetStateAction<FilterRefineValues>>
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((field) => {
        const span = field.span ?? (field.type === "checkbox" ? 1 : 2)
        return (
          <div
            key={field.id}
            className={cn("space-y-1", span === 2 ? "col-span-2" : "col-span-1")}
          >
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {field.label}
            </Label>

            {field.type === "checkbox" ? (
              field.options.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">No options.</p>
              ) : (
                <div
                  className={cn(
                    "gap-x-4 gap-y-0.5",
                    (field.columns ?? 1) === 2 ? "grid grid-cols-2" : "space-y-0.5"
                  )}
                >
                  {field.options.map((option) => {
                    const selected = asStringList(draft[field.id])
                    return (
                      <CheckboxRow
                        key={option.value}
                        id={`filter-refine-${field.id}-${option.value}`}
                        label={option.label}
                        checked={selected.includes(option.value)}
                        onCheckedChange={() => {
                          setDraft((prev) => ({
                            ...prev,
                            [field.id]: toggleValue(
                              asStringList(prev[field.id]),
                              option.value
                            ),
                          }))
                        }}
                      />
                    )
                  })}
                </div>
              )
            ) : null}

            {field.type === "search-select" ? (
              field.multiple === false ? (
                <SearchSelect
                  options={field.options}
                  value={asStringList(draft[field.id])[0] ?? ""}
                  onValueChange={(next) => {
                    setDraft((prev) => ({
                      ...prev,
                      [field.id]: next ? [next] : [],
                    }))
                  }}
                  placeholder={field.placeholder ?? "Select…"}
                  searchPlaceholder={field.searchPlaceholder ?? "Search…"}
                  emptyText={field.emptyText ?? "No results."}
                />
              ) : (
                <SearchSelect
                  multiple
                  options={field.options}
                  value={asStringList(draft[field.id])}
                  onValueChange={(next) => {
                    setDraft((prev) => ({ ...prev, [field.id]: next }))
                  }}
                  placeholder={field.placeholder ?? "Select…"}
                  searchPlaceholder={field.searchPlaceholder ?? "Search…"}
                  emptyText={field.emptyText ?? "No results."}
                />
              )
            ) : null}

            {field.type === "range" ? (
              <RangeField
                field={field}
                value={asRangeValue(draft[field.id])}
                onChange={(next) => {
                  setDraft((prev) => ({ ...prev, [field.id]: next }))
                }}
              />
            ) : null}

            {field.type === "date-range" ? (
              <DateRangeField
                field={field}
                value={asDateRangeValue(draft[field.id])}
                onChange={(next) => {
                  setDraft((prev) => ({ ...prev, [field.id]: next }))
                }}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function FilterHeaderActions({
  onCancel,
  onApply,
}: {
  onCancel: () => void
  onApply: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="sm" className="h-7" onClick={onApply}>
        Apply
      </Button>
    </div>
  )
}

export function FilterRefine({
  title = "Refine results",
  description,
  fields,
  values,
  onApply,
  triggerClassName,
  ariaLabel = "Refine filters",
}: {
  title?: string
  description?: string
  fields: FilterRefineField[]
  values: FilterRefineValues
  onApply: (next: FilterRefineValues) => void
  triggerClassName?: string
  ariaLabel?: string
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterRefineValues>(values)
  const appliedCount = countFilterRefineValues(fields, values)
  const draftCount = countFilterRefineValues(fields, draft)

  useEffect(() => {
    if (open) setDraft(values)
  }, [open, values])

  function apply() {
    onApply(draft)
    setOpen(false)
  }

  function clearAll() {
    const empty = emptyFilterRefineValues(fields)
    setDraft(empty)
    onApply(empty)
    setOpen(false)
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground",
        triggerClassName
      )}
      aria-label={ariaLabel}
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <ListFilter className="h-4 w-4" />
      {appliedCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {appliedCount}
        </span>
      ) : null}
    </Button>
  )

  const body = (
    <FilterFieldsBody fields={fields} draft={draft} setDraft={setDraft} />
  )

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="flex max-h-[min(85dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl p-0"
          >
            <SheetHeader className="shrink-0 space-y-0 border-b border-border px-3 py-2.5 text-left">
              <div className="flex items-center justify-between gap-2 pr-0">
                <div className="min-w-0">
                  <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
                  {description ? (
                    <p className="text-xs text-muted-foreground">{description}</p>
                  ) : null}
                  {draftCount > 0 ? (
                    <button
                      type="button"
                      className="mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      onClick={clearAll}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
                <FilterHeaderActions
                  onCancel={() => setOpen(false)}
                  onApply={apply}
                />
              </div>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {body}
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        avoidCollisions
        className="flex w-[28rem] max-h-[min(24rem,calc(100dvh-1.5rem))] flex-col overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
            {draftCount > 0 ? (
              <button
                type="button"
                className="mt-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={clearAll}
              >
                Clear filters
              </button>
            ) : null}
          </div>
          <FilterHeaderActions
            onCancel={() => setOpen(false)}
            onApply={apply}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {body}
        </div>
      </PopoverContent>
    </Popover>
  )
}
