import { cn } from "@/lib/utils"
import { TrendBadge } from "@/components/dashboard/trend-badge"

type BorderColor = "primary" | "success" | "warning" | "accent"

interface StatCardProps {
  title: string
  value: string
  change?: number
  borderColor?: BorderColor
}

const borderColorClasses: Record<BorderColor, string> = {
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  accent:  "border-l-chart-2",
}

export function StatCard({ title, value, change, borderColor = "primary" }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 border-l-[3px]",
        borderColorClasses[borderColor]
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {typeof change === "number" && (
        <div className="mt-2 flex items-center gap-1.5">
          <TrendBadge value={change} />
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  )
}
