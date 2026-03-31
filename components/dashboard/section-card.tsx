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
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {hasHeader && (
        <div className="flex items-start justify-between px-6 pb-2 pt-5">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && (hasHeader ? "px-6 pb-6 pt-3" : "p-6"))}>{children}</div>
      {footer && <div className="border-t border-border px-6 py-3">{footer}</div>}
    </div>
  )
}
