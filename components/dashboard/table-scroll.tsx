import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Confines wide tables to horizontal scroll without expanding the page. */
export function TableScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 max-w-full overflow-x-auto", className)}>
      {children}
    </div>
  )
}
