"use client"

import Link from "next/link"
import { Users, ArrowRight, BookOpen, Sparkles } from "lucide-react"
import { useCoached } from "@/hooks/use-coached"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatProductDate, productTypeLabel } from "@/lib/coached"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

export default function CoachingHomePage() {
  const { user } = useAuth()
  const { coachedOrgs, coachedProducts, isLoading } = useCoached()

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "there"
  const myCoaches = coachedOrgs
  const myProducts = coachedProducts

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6">
        <h1 className="text-2xl font-bold text-foreground font-display text-balance">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re working with {myCoaches.length} coach{myCoaches.length !== 1 ? "es" : ""}. Here&apos;s your coaching space.
        </p>
      </div>

      {/* My coaches */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            My coaches
          </h2>
          <Link
            href="/coached/coaches?tab=my"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {myCoaches.length > 0 ? (
          <div className="space-y-3">
            {myCoaches.map((org) => (
              <Link key={org.organization_id} href={`/coached/coaches/${org.organization_id}`}>
                <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                  <CardContent className="flex gap-4 p-4">
                    <Avatar className="h-14 w-14 shrink-0 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {orgInitials(org.organization_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{org.organization_name}</p>
                        <Badge variant="secondary" className="text-[10px]">With you</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{org.organization_slug}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">No coach yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Purchase an offer to get access to a coach&apos;s programs</p>
              <Link href="/">
                <Button size="sm" className="mt-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Browse offers
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Continue learning — products the user has access to */}
      {myProducts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              Continue learning
            </h2>
            <Link href="/coached/courses" className="text-xs font-medium text-primary hover:underline">
              All programs
            </Link>
          </div>
          <div className="space-y-2">
            {myProducts.slice(0, 5).map((p) => {
              const isCoaching = p.product_type === "coaching"
              const href = isCoaching
                ? `/coached/${p.organization_slug}/coaching/${p.product_id}`
                : `/coached/${p.organization_slug}/courses/${p.product_id}`
              return (
                <Link key={`${p.enrollment_id}-${p.product_id}`} href={href}>
                  <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {p.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">{p.product_title}</p>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {productTypeLabel(p.product_type)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">with {p.organization_name}</p>
                        {(p.completion_total != null && p.completion_total > 0) && (
                          <p className="text-xs text-primary font-medium mt-1">
                            {p.completion_completed ?? 0}/{p.completion_total} {isCoaching ? "sessions" : "completed"}
                          </p>
                        )}
                        {isCoaching && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.coach_full_name ? `Coach: ${p.coach_full_name}` : "No coach assigned yet"}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                          {p.started_at && (
                            <span>Started {formatProductDate(p.started_at)}</span>
                          )}
                          {p.expires_at && (
                            <span>Expires {formatProductDate(p.expires_at)}</span>
                          )}
                          {p.enrollment_status && p.enrollment_status !== "active" && (
                            <span className="capitalize">{p.enrollment_status}</span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Discover — placeholder: we don't fetch "all orgs" yet */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Discover coaches
          </h2>
          <Link href="/coached/coaches?tab=discover" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <Card className="border-border">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">Find new coaches from their public pages and purchase an offer to get access.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
