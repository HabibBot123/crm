import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationControls({ page, pageSize, total, onPageChange }: Props) {
  if (total <= pageSize) return null

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, totalPages)

  const canGoPrev = current > 1
  const canGoNext = current < totalPages

  const handlePrev = () => {
    if (canGoPrev) onPageChange(current - 1)
  }

  const handleNext = () => {
    if (canGoNext) onPageChange(current + 1)
  }

  const pages: number[] = []
  for (let p = 1; p <= totalPages; p += 1) {
    pages.push(p)
  }

  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault()
              handlePrev()
            }}
            aria-disabled={!canGoPrev}
          />
        </PaginationItem>
        {pages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              href="#"
              isActive={p === current}
              onClick={(e) => {
                e.preventDefault()
                onPageChange(p)
              }}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault()
              handleNext()
            }}
            aria-disabled={!canGoNext}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

