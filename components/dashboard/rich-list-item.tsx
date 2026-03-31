import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RichListItemProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function RichListItem({ children, className, onClick }: RichListItemProps) {
  return (
    <li
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </li>
  )
}
