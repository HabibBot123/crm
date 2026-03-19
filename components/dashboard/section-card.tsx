import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: string
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function SectionCard({ title, action, footer, children, className, noPadding }: SectionCardProps) {
  const hasHeader = title || action
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {hasHeader && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-6")}>{children}</div>
      {footer && <div className="border-t border-border px-6 py-3">{footer}</div>}
    </div>
  )
}
