"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Users, Star, Sparkles, ArrowRight } from "lucide-react"
import { coaches, currentClientCoachIds } from "@/lib/mock-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const myCoachIds = currentClientCoachIds
const myCoaches = coaches.filter((c) => myCoachIds.includes(c.id))
const availableCoaches = coaches.filter((c) => !myCoachIds.includes(c.id))

function CoachCard({
  coach,
  isSubscribed,
}: {
  coach: (typeof coaches)[0]
  isSubscribed: boolean
}) {
  return (
    <Link href={`/coaching/coaches/${coach.id}`}>
      <Card
        className={`border-border transition-all hover:border-primary/30 hover:shadow-sm ${!isSubscribed ? "border-dashed" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Avatar className="h-14 w-14 shrink-0 border-2 border-border">
              <AvatarFallback
                className={isSubscribed ? "bg-primary/10 text-primary text-lg font-bold" : "bg-muted text-muted-foreground"}
              >
                {coach.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">{coach.name}</p>
                {isSubscribed ? (
                  <Badge variant="secondary" className="text-[10px]">With you</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Available</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{coach.title}</p>
              {coach.tagline && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{coach.tagline}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {coach.rating}
                </span>
                <span>{coach.clientsCount} clients</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground self-center" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function CoachingCoachesPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const defaultTab = tabParam === "discover" ? "discover" : "my"

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground font-display">Coaches</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your coaches and others you can work with
      </p>

      <Tabs defaultValue={defaultTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my" className="gap-1.5">
            <Users className="h-4 w-4" />
            My coaches ({myCoaches.length})
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Discover ({availableCoaches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4 space-y-3">
          {myCoaches.length > 0 ? (
            myCoaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} isSubscribed={true} />
            ))
          ) : (
            <Card className="border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">No coaches yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Switch to Discover to find and connect with coaches
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4 space-y-3">
          {availableCoaches.length > 0 ? (
            availableCoaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} isSubscribed={false} />
            ))
          ) : (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">You&apos;re all set</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You&apos;re already connected with all available coaches
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
