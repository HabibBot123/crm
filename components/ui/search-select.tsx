"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type SearchSelectOption = {
  value: string
  label: string
}

type SearchSelectSharedProps = {
  options: SearchSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /** Optional first option (e.g. Unassigned → `"none"`). */
  noneOption?: SearchSelectOption | null
}

type SearchSelectSingleProps = SearchSelectSharedProps & {
  multiple?: false
  value: string
  onValueChange: (value: string) => void
}

type SearchSelectMultiProps = SearchSelectSharedProps & {
  multiple: true
  value: string[]
  onValueChange: (value: string[]) => void
}

export type SearchSelectProps = SearchSelectSingleProps | SearchSelectMultiProps

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/** Combobox select with search — generic for members, products, BUs, etc. */
export function SearchSelect(props: SearchSelectProps) {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyText = "No results.",
    disabled = false,
    className,
    noneOption = null,
  } = props

  const multiple = props.multiple === true
  const [open, setOpen] = useState(false)
  const allOptions = noneOption ? [noneOption, ...options] : options

  const selectedValues = multiple ? props.value : props.value ? [props.value] : []
  const selectedLabels = selectedValues
    .map((value) => allOptions.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label))

  const triggerLabel =
    selectedLabels.length === 0
      ? placeholder
      : multiple
        ? selectedLabels.length <= 2
          ? selectedLabels.join(", ")
          : `${selectedLabels.length} selected`
        : selectedLabels[0]

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal pr-2.5",
            selectedLabels.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={16}
        className="z-[60] w-[var(--radix-popover-trigger-width)] max-h-[min(20rem,var(--radix-popover-content-available-height))] overflow-hidden p-0"
      >
        <Command className="flex max-h-[inherit] flex-col overflow-hidden">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-none min-h-0 flex-1 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allOptions.map((option) => {
                const checked = selectedValues.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    onSelect={() => {
                      if (multiple) {
                        props.onValueChange(toggleValue(props.value, option.value))
                        return
                      }
                      props.onValueChange(option.value)
                      setOpen(false)
                    }}
                  >
                    {multiple ? (
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          checked ? "opacity-100" : "opacity-0"
                        )}
                      />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
