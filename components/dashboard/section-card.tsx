import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function SectionCard({ title, subtitle, action, footer, children, className, noPadding }: SectionCardProps) {
  const hasHeader = title || subtitle || action
  return (
    <div className={cn("w-full min-w-0 rounded-xl border border-border bg-card", className)}>
      {hasHeader && (
        <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2 px-6 pb-2 pt-5">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="min-w-0">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          "min-w-0",
          noPadding ? "overflow-x-auto" : hasHeader ? "px-6 pb-6 pt-3" : "p-6"
        )}
      >
        {children}
      </div>
      {footer && (
        <div className="min-w-0 border-t border-border px-4 py-2">{footer}</div>
      )}
    </div>
  )
}
