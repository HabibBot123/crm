"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type CourseProgressBarProps = {
  completed: number
  total: number
  /** Compact strip for PageHeader (no "Progress" label). */
  compact?: boolean
  className?: string
}

export function CourseProgressBar({
  completed,
  total,
  compact = false,
  className,
}: CourseProgressBarProps) {
  const value = total > 0 ? Math.round((completed / total) * 100) : 0

  if (compact) {
    return (
      <div className={cn("flex w-full flex-col gap-1", className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {completed}/{total}
          </span>
        </div>
        <Progress
          value={value}
          className="h-1.5"
          aria-label={`${value}% complete`}
        />
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Progress
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {completed}/{total} lessons
        </span>
      </div>
      <Progress
        value={value}
        className="h-2.5"
        aria-label={`${value}% complete`}
      />
    </div>
  )
}
