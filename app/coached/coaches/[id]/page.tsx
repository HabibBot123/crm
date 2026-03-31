"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  formatProductDate,
  productTypeBadgeClassName,
  productTypeLabel,
} from "@/lib/coached"
import { cn } from "@/lib/utils"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

function programHref(p: CoachedProduct): string {
  if (p.product_type === "coaching") {
    return `/coached/${p.organization_slug}/coaching/${p.product_id}`
  }
  return `/coached/${p.organization_slug}/courses/${p.product_id}`
}

function CoachProgramRow({ product }: { product: CoachedProduct }) {
  const isCoaching = product.product_type === "coaching"
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
                {product.completion_completed ?? 0}/{product.completion_total}{" "}
                {isCoaching ? "sessions" : "completed"}
              </span>
            )}
          </div>
          {isCoaching && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.coach_full_name
                ? `Coach: ${product.coach_full_name}`
                : "Coach not yet assigned"}
            </p>
          )}
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

export default function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const orgId = Number(id)
  const { coachedOrgs, coachedProducts, isLoading } = useCoached()

  const org = coachedOrgs.find((o) => o.organization_id === orgId)
  const coachProducts = org
    ? coachedProducts.filter((p) => p.organization_id === orgId)
    : []

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-36 animate-pulse rounded-2xl bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">Coach not found</p>
        <Link href="/coached/coaches">
          <Button variant="outline" className="mt-4">
            Back to coaches
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/coached/coaches">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground">
          Coach
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          <Avatar className="h-20 w-20 shrink-0 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {orgInitials(org.organization_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                {org.organization_name}
              </h2>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-xs font-normal text-primary normal-case"
              >
                With you
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">@{org.organization_slug}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Programs you have access to
        </h3>
        {coachProducts.length > 0 ? (
          <ul className="space-y-3">
            {coachProducts.map((p) => (
                <CoachProgramRow key={`${p.enrollment_id}-${p.product_id}`} product={p} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No programs yet"
            description="When you purchase an offer from this coach, your programs will appear here."
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/coached/coaches">Back to coaches</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}
