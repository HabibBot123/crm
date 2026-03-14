"use client"

import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LessonNavProps = {
  onPrevious: () => void
  onNext: () => void
  onMarkComplete: () => void
  hasPrevious: boolean
  hasNext: boolean
  isCompleted: boolean
  markCompletePending: boolean
  className?: string
}

export function LessonNav({
  onPrevious,
  onNext,
  onMarkComplete,
  hasPrevious,
  hasNext,
  isCompleted,
  markCompletePending,
  className,
}: LessonNavProps) {
  return (
    <nav
      className={cn(
        "flex items-center justify-between gap-3 sm:gap-4",
        className,
      )}
      aria-label="Lesson navigation"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="gap-1.5 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation"
        aria-label="Previous lesson"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      <Button
        variant={isCompleted ? "secondary" : "default"}
        size="sm"
        onClick={onMarkComplete}
        disabled={markCompletePending}
        className="gap-2 min-h-[44px] min-w-0 flex-1 sm:flex-initial touch-manipulation"
        aria-label={isCompleted ? "Already completed" : "Mark as complete"}
      >
        {markCompletePending ? (
          <span className="text-sm">Saving…</span>
        ) : isCompleted ? (
          <>
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">Completed</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">Mark complete</span>
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="gap-1.5 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation"
        aria-label="Next lesson"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Button>
    </nav>
  )
}
