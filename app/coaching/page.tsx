"use client"

import Link from "next/link"
import { Users, Star, ArrowRight, BookOpen, Sparkles } from "lucide-react"
import { coaches, currentClientCoachIds, products } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const myCoachIds = currentClientCoachIds
const myCoaches = coaches.filter((c) => myCoachIds.includes(c.id))
const availableCoaches = coaches.filter((c) => !myCoachIds.includes(c.id))

/** Product IDs the client has access to (from any of their coaches). */
const myProductIds = Array.from(
  new Set(myCoaches.flatMap((c) => c.productIds))
)
const enrolledCourseIds = ["1", "2", "3"]
const myEnrolledProducts = products.filter(
  (p) => p.status === "published" && myProductIds.includes(p.id) && enrolledCourseIds.includes(p.id)
)

export default function CoachingHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6">
        <h1 className="text-2xl font-bold text-foreground font-display text-balance">
          Welcome back, Sarah
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re working with {myCoaches.length} coach{myCoaches.length !== 1 ? "es" : ""}. Here&apos;s your coaching space.
        </p>
      </div>

      {/* My coaches — subscribed */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            My coaches
          </h2>
          <Link
            href="/coaching/coaches?tab=my"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {myCoaches.length > 0 ? (
          <div className="space-y-3">
            {myCoaches.map((coach) => (
              <Link key={coach.id} href={`/coaching/coaches/${coach.id}`}>
                <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                  <CardContent className="flex gap-4 p-4">
                    <Avatar className="h-14 w-14 shrink-0 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                        {coach.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{coach.name}</p>
                        <Badge variant="secondary" className="text-[10px]">With you</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{coach.title}</p>
                      {coach.tagline && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{coach.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {coach.rating}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
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
              <p className="mt-1 text-xs text-muted-foreground">Discover coaches and start your journey</p>
              <Link href="/coaching/coaches">
                <Button size="sm" className="mt-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Discover coaches
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick access: programs from my coaches */}
      {myEnrolledProducts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              Continue learning
            </h2>
            <Link href="/coaching/courses" className="text-xs font-medium text-primary hover:underline">
              All programs
            </Link>
          </div>
          <div className="space-y-2">
            {myEnrolledProducts.slice(0, 2).map((product) => {
              const coach = myCoaches.find((c) => c.productIds.includes(product.id))
              return (
                <Link key={product.id} href={`/coaching/courses/${product.id}`}>
                  <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{product.title}</p>
                        {coach && (
                          <p className="text-xs text-muted-foreground">with {coach.name}</p>
                        )}
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

      {/* Discover coaches — available to subscribe */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Discover coaches
          </h2>
          <Link
            href="/coaching/coaches?tab=discover"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {availableCoaches.length > 0 ? (
          <div className="space-y-3">
            {availableCoaches.slice(0, 2).map((coach) => (
              <Link key={coach.id} href={`/coaching/coaches/${coach.id}`}>
                <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm border-dashed">
                  <CardContent className="flex gap-4 p-4">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                        {coach.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{coach.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{coach.tagline ?? coach.title}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">Available</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {availableCoaches.length > 2 && (
              <Link href="/coaching/coaches?tab=discover">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  See {availableCoaches.length - 2} more coach{availableCoaches.length - 2 !== 1 ? "es" : ""}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">You&apos;re already connected with all available coaches.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
