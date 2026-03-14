"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatProductDate, productTypeLabel } from "@/lib/coached"

function CourseCard({ product }: { product: CoachedProduct }) {
  return (
    <Link href={`/coached/${product.organization_slug}/courses/${product.product_id}`}>
      <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {product.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.cover_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <BookOpen className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{product.product_title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">with {product.organization_name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {productTypeLabel(product.product_type)}
                </Badge>
                {product.completion_total != null && product.completion_total > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {product.completion_completed ?? 0}/{product.completion_total} completed
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                {product.started_at && (
                  <span>Started {formatProductDate(product.started_at)}</span>
                )}
                {product.expires_at && (
                  <span>Expires {formatProductDate(product.expires_at)}</span>
                )}
                {product.enrollment_status && product.enrollment_status !== "active" && (
                  <span className="capitalize">{product.enrollment_status}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/** Dedupe by product_id, keep first row (for org name). */
function uniqueProducts(products: CoachedProduct[]): CoachedProduct[] {
  const seen = new Set<number>()
  return products.filter((p) => {
    if (seen.has(p.product_id)) return false
    seen.add(p.product_id)
    return true
  })
}

export default function CoachingCoursesPage() {
  const { coachedProducts, isLoading } = useCoached()
  const products = uniqueProducts(coachedProducts)

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">My Programs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Programs from your coaches</p>
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground font-display">My Programs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Programs from your coaches — access your content here
      </p>

      <div className="mt-6 space-y-3">
        {products.length > 0 ? (
          products.map((p) => (
            <CourseCard key={p.product_id} product={p} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">No programs yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect with coaches by purchasing an offer to access their programs
            </p>
            <Link href="/coached/coaches">
              <span className="text-xs font-medium text-primary hover:underline">
                Go to Coaches
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
