import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { TrendBadge } from "@/components/dashboard/trend-badge"

type IconColor = "primary" | "success" | "warning" | "accent"

interface StatCardProps {
  title: string
  value: string
  change?: number
  icon: LucideIcon
  iconColor?: IconColor
}

const iconColorClasses: Record<IconColor, { bg: string; icon: string }> = {
  primary: { bg: "bg-primary/10",  icon: "text-primary"             },
  success: { bg: "bg-success/10",  icon: "text-success"             },
  warning: { bg: "bg-warning/10",  icon: "text-warning-foreground"  },
  accent:  { bg: "bg-accent/15",   icon: "text-accent-foreground"   },
}

export function StatCard({ title, value, change, icon: Icon, iconColor = "primary" }: StatCardProps) {
  const colors = iconColorClasses[iconColor]
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
      {typeof change === "number" && (
        <div className="mt-2 flex items-center gap-1.5">
          <TrendBadge value={change} />
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  )
}
