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
        "flex items-center justify-between gap-2",
        className
      )}
      aria-label="Lesson navigation"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious}
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
        className="min-w-0 flex-1 sm:flex-initial"
        aria-label={isCompleted ? "Already completed" : "Mark as complete"}
      >
        {markCompletePending ? (
          <span>Saving…</span>
        ) : (
          <>
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {isCompleted ? "Completed" : "Mark complete"}
            </span>
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next lesson"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Button>
    </nav>
  )
}
