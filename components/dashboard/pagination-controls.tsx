"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

type PageItem = number | "ellipsis"

function buildPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: PageItem[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)

  if (start > 2) items.push("ellipsis")
  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }
  if (end < totalPages - 1) items.push("ellipsis")
  items.push(totalPages)

  return items
}

export function PaginationControls({ page, pageSize, total, onPageChange }: Props) {
  if (total <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, totalPages)
  const canGoPrev = current > 1
  const canGoNext = current < totalPages
  const pages = buildPageItems(current, totalPages)

  return (
    <nav aria-label="pagination" className="shrink-0">
      <ul className="flex items-center gap-0.5">
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={!canGoPrev}
            onClick={() => onPageChange(current - 1)}
          >
            <ChevronLeft />
          </Button>
        </li>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              className="flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground"
              aria-hidden
            >
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                type="button"
                variant={item === current ? "outline" : "ghost"}
                size="icon"
                aria-label={`Page ${item}`}
                aria-current={item === current ? "page" : undefined}
                className={cn(
                  item === current && "bg-accent text-accent-foreground"
                )}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </li>
          )
        )}
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={!canGoNext}
            onClick={() => onPageChange(current + 1)}
          >
            <ChevronRight />
          </Button>
        </li>
      </ul>
    </nav>
  )
}
