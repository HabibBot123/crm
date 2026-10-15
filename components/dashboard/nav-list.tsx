"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface NavListItem<T extends string = string> {
  id: T
  label: string
  icon: LucideIcon
}

interface NavListProps<T extends string = string> {
  items: NavListItem<T>[]
  value: T
  onChange: (id: T) => void
  footer?: ReactNode
  className?: string
}

export function NavList<T extends string = string>({
  items,
  value,
  onChange,
  footer,
  className,
}: NavListProps<T>) {
  const selected = items.find((item) => item.id === value)
  const SelectedIcon = selected?.icon

  function handleSelectChange(next: string) {
    const match = items.find((item) => item.id === next)
    if (match) onChange(match.id)
  }

  return (
    <div className={cn("w-full md:w-48 md:shrink-0", className)}>
      <div className="space-y-2 md:hidden">
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {selected && SelectedIcon ? (
                <span className="flex min-w-0 items-center gap-2">
                  <SelectedIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{selected.label}</span>
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items.map(({ id, label, icon: Icon }) => (
              <SelectItem key={id} value={id}>
                <Icon className="h-4 w-4" />
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {footer}
      </div>

      <nav className="hidden space-y-1 md:block">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onChange(id)}
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              value === id
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
        {footer && <div className="pt-2">{footer}</div>}
      </nav>
    </div>
  )
}
