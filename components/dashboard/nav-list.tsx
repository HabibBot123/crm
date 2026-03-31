import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function NavList<T extends string = string>({
  items,
  value,
  onChange,
  footer,
}: NavListProps<T>) {
  return (
    <nav className="w-44 shrink-0 space-y-1">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            value === id
              ? "bg-accent font-medium text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
      {footer && <div className="pt-2">{footer}</div>}
    </nav>
  )
}
