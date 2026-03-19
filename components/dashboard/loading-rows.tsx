import { cn } from "@/lib/utils"

interface LoadingRowsProps {
  count?: number
  className?: string
}

export function LoadingRows({ count = 5, className }: LoadingRowsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

export function LoadingGrid({ count = 4, className }: LoadingRowsProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  )
}
