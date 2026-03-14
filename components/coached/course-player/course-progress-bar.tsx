"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type CourseProgressBarProps = {
  completed: number
  total: number
  className?: string
}

export function CourseProgressBar({
  completed,
  total,
  className,
}: CourseProgressBarProps) {
  const value = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Progress
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completed}/{total} lessons
        </span>
      </div>
      <Progress value={value} className="h-2.5" aria-label={`${value}% complete`} />
    </div>
  )
}
