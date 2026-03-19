"use client"

type PaginationSummaryProps = {
  page: number
  pageSize: number
  total: number
}

export function PaginationSummary({ page, pageSize, total }: PaginationSummaryProps) {
  const start = (page - 1) * pageSize
  const end = start + pageSize

  const from = total === 0 ? 0 : start + 1
  const to = Math.min(end, total)

  return (
    <p className="text-xs text-muted-foreground">
      Showing {from}–{to} of {total}
    </p>
  )
}

