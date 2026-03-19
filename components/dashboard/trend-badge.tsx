import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrendBadgeProps {
  value: number
  className?: string
}

export function TrendBadge({ value, className }: TrendBadgeProps) {
  if (value === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", className)}>
        <Minus className="h-3 w-3" />
        0%
      </span>
    )
  }

  const isPositive = value > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-success" : "text-destructive",
        className
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}{value}%
    </span>
  )
}
