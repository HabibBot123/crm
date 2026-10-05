"use client"

import Link from "next/link"
import { Users, ArrowRight, BookOpen } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"
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

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

function ProductRowContent({ p }: { p: CoachedProduct }) {
  const isCoaching = p.product_type === "coaching"
  return (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {p.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-foreground">{p.product_title}</p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-normal normal-case",
              productTypeBadgeClassName(p.product_type)
            )}
          >
            {productTypeLabel(p.product_type)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">with {p.organization_name}</p>
        {p.completion_total != null && p.completion_total > 0 && (
          <p className="mt-1 text-xs font-medium text-primary">
            {p.completion_completed ?? 0}/{p.completion_total}{" "}
            {isCoaching ? "sessions" : "completed"}
          </p>
        )}
        {isCoaching && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.coach_full_name ? `Your coach: ${p.coach_full_name}` : "Coach not yet assigned"}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {p.started_at && <span>Started {formatProductDate(p.started_at)}</span>}
          {p.expires_at && <span>Expires {formatProductDate(p.expires_at)}</span>}
          {p.enrollment_status && p.enrollment_status !== "active" && (
            <span className="capitalize">{p.enrollment_status}</span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  )
}

export default function CoachingHomePage() {
  const { user } = useAuth()
  const { coachedOrgs, coachedProducts, isLoading } = useCoached()

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "there"
  const continueProduct = coachedProducts[0] ?? null
  const morePrograms = coachedProducts.length > 1 ? coachedProducts.slice(1, 6) : []

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground text-balance">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resume your programs and see the organizations you bought from.
        </p>
      </div>

      {continueProduct && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Continue</h2>
            <Link
              href="/coached/courses"
              className="text-xs font-medium text-primary hover:underline"
            >
              All programs
            </Link>
          </div>
          <ul className="space-y-3">
            <RichListItem className="p-0">
              <Link
                href={programHref(continueProduct)}
                className="flex w-full min-w-0 items-center gap-4 p-4"
              >
                <ProductRowContent p={continueProduct} />
              </Link>
            </RichListItem>
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Your organizations</h2>
          <Link
            href="/coached/coaches"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {coachedOrgs.length > 0 ? (
          <ul className="space-y-3">
            {coachedOrgs.map((org) => (
              <RichListItem key={org.organization_id} className="p-0">
                <Link
                  href={`/coached/coaches/${org.organization_id}`}
                  className="flex w-full min-w-0 items-center gap-4 p-4"
                >
                  <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {orgInitials(org.organization_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{org.organization_name}</p>
                      <StatusBadge status="active" className="text-[10px] font-normal normal-case" />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      @{org.organization_slug}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </RichListItem>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            title="No organizations yet"
            description="Buy an offer from a coach’s store page. Ask them for the link if you don’t have it."
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link href="/">Back to CoachStack</Link>
              </Button>
            }
          />
        )}
      </section>

      {morePrograms.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Your programs</h2>
            <Link
              href="/coached/courses"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open library
            </Link>
          </div>
          <ul className="space-y-3">
            {morePrograms.map((p) => (
              <RichListItem key={p.enrollment_product_id} className="p-0">
                <Link
                  href={programHref(p)}
                  className="flex w-full min-w-0 items-center gap-4 p-4"
                >
                  <ProductRowContent p={p} />
                </Link>
              </RichListItem>
            ))}
          </ul>
        </section>
      )}

      {!continueProduct && coachedProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Your programs</h2>
            <Link
              href="/coached/courses"
              className="text-xs font-medium text-primary hover:underline"
            >
              All programs
            </Link>
          </div>
          <ul className="space-y-3">
            {coachedProducts.slice(0, 5).map((p) => (
              <RichListItem key={p.enrollment_product_id} className="p-0">
                <Link
                  href={programHref(p)}
                  className="flex w-full min-w-0 items-center gap-4 p-4"
                >
                  <ProductRowContent p={p} />
                </Link>
              </RichListItem>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
