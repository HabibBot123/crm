import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: string
  /** Optional control beside the title (e.g. help). */
  titleAside?: ReactNode
  children?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  back,
  titleAside,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {back && (
          <Link
            href={back}
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {title}
            </h1>
            {titleAside}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  )
}
