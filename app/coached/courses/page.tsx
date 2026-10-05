"use client"

import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  formatProductDate,
  productTypeBadgeClassName,
  productTypeLabel,
  programHref,
} from "@/lib/coached"
import { cn } from "@/lib/utils"

function CourseRow({ product }: { product: CoachedProduct }) {
  return (
    <RichListItem className="p-0">
      <Link href={programHref(product)} className="flex w-full min-w-0 items-center gap-4 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {product.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{product.product_title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">with {product.organization_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-normal normal-case",
                productTypeBadgeClassName(product.product_type)
              )}
            >
              {productTypeLabel(product.product_type)}
            </Badge>
            {product.completion_total != null && product.completion_total > 0 && (
              <span className="text-xs font-medium text-primary">
                {product.completion_completed ?? 0}/{product.completion_total} completed
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {product.started_at && <span>Started {formatProductDate(product.started_at)}</span>}
            {product.expires_at && <span>Expires {formatProductDate(product.expires_at)}</span>}
            {product.enrollment_status && product.enrollment_status !== "active" && (
              <span className="capitalize">{product.enrollment_status}</span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
  )
}

export default function CoachingCoursesPage() {
  const { coachedProducts, isLoading } = useCoached()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            My programs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses and coaching you can open
          </p>
        </div>
        <LoadingRows count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          My programs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Courses and coaching you have access to
        </p>
      </div>

      {coachedProducts.length > 0 ? (
        <ul className="space-y-3">
          {coachedProducts.map((p) => (
            <CourseRow key={p.enrollment_product_id} product={p} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No programs yet"
          description="When you buy an offer, your programs appear here. Ask your coach for their store page link."
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/coached/coaches">Go to organizations</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
