"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Users, Sparkles, ArrowRight } from "lucide-react"
import { useCoached, type CoachedOrg } from "@/hooks/use-coached"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

function CoachCard({ org }: { org: CoachedOrg }) {
  return (
    <Link href={`/coached/coaches/${org.organization_id}`}>
      <Card className="border-border transition-all hover:border-primary/30 hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
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
  const { coachedOrgs, isLoading } = useCoached()

  const myCoaches = coachedOrgs

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Coaches</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your coaches and others you can work with</p>
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

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
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4 space-y-3">
          {myCoaches.length > 0 ? (
            myCoaches.map((org) => <CoachCard key={org.organization_id} org={org} />)
          ) : (
            <Card className="border-dashed border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">No coaches yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Purchase an offer from a coach&apos;s public page to get access
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4 space-y-3">
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">Discover coaches</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Visit coaches&apos; public pages and purchase an offer to work with them
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
