import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { cn } from "@/lib/utils"

interface PaginationRowProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationRow({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <PaginationSummary page={page} pageSize={pageSize} total={total} />
      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  )
}
