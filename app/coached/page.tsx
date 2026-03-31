"use client"

import Link from "next/link"
import { Users, ArrowRight, BookOpen, Sparkles } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { formatProductDate, productTypeBadgeClassName, productTypeLabel } from "@/lib/coached"
import { cn } from "@/lib/utils"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

function productHref(p: CoachedProduct): string {
  const isCoaching = p.product_type === "coaching"
  return isCoaching
    ? `/coached/${p.organization_slug}/coaching/${p.product_id}`
    : `/coached/${p.organization_slug}/courses/${p.product_id}`
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
            className={cn("text-[10px] font-normal normal-case", productTypeBadgeClassName(p.product_type))}
          >
            {productTypeLabel(p.product_type)}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">with {p.organization_name}</p>
        {p.completion_total != null && p.completion_total > 0 && (
          <p className="mt-1 text-xs font-medium text-primary">
            {p.completion_completed ?? 0}/{p.completion_total} {isCoaching ? "sessions" : "completed"}
          </p>
        )}
        {isCoaching && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.coach_full_name ? `Coach: ${p.coach_full_name}` : "Coach not yet assigned"}
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
  const myCoaches = coachedOrgs
  const myProducts = coachedProducts
  const continueProduct = myProducts[0] ?? null
  const morePrograms = myProducts.length > 1 ? myProducts.slice(1, 6) : []

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
          Your space to resume programs, message progress with coaches, and use what you bought.
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
                href={productHref(continueProduct)}
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
          <h2 className="text-sm font-semibold text-foreground">My coaches</h2>
          <Link href="/coached/coaches?tab=my" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {myCoaches.length > 0 ? (
          <ul className="space-y-3">
            {myCoaches.map((org) => (
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
            title="No coach yet"
            description="Purchase an offer from a coach’s public page to unlock programs here."
            action={
              <Button size="sm" className="gap-2" asChild>
                <Link href="/">
                  <Sparkles className="h-4 w-4" />
                  Browse offers
                </Link>
              </Button>
            }
          />
        )}
      </section>

      {morePrograms.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Your programs</h2>
            <Link href="/coached/courses" className="text-xs font-medium text-primary hover:underline">
              Open library
            </Link>
          </div>
          <ul className="space-y-3">
            {morePrograms.map((p) => (
              <RichListItem key={`${p.enrollment_id}-${p.product_id}`} className="p-0">
                <Link
                  href={productHref(p)}
                  className="flex w-full min-w-0 items-center gap-4 p-4"
                >
                  <ProductRowContent p={p} />
                </Link>
              </RichListItem>
            ))}
          </ul>
        </section>
      )}

      {!continueProduct && myProducts.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Your programs</h2>
            <Link href="/coached/courses" className="text-xs font-medium text-primary hover:underline">
              All programs
            </Link>
          </div>
          <ul className="space-y-3">
            {myProducts.slice(0, 5).map((p) => (
              <RichListItem key={`${p.enrollment_id}-${p.product_id}`} className="p-0">
                <Link
                  href={productHref(p)}
                  className="flex w-full min-w-0 items-center gap-4 p-4"
                >
                  <ProductRowContent p={p} />
                </Link>
              </RichListItem>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Discover coaches</h2>
          <Link href="/coached/coaches?tab=discover" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-2xl bg-muted/40 p-5">
          <p className="text-sm text-muted-foreground">
            Find coaches from their public pages and buy an offer to add programs to this app.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" asChild>
            <Link href="/coached/coaches?tab=discover">Explore</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
