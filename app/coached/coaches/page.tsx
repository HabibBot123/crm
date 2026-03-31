"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Users, Sparkles, ArrowRight } from "lucide-react"
import { useCoached, type CoachedOrg } from "@/hooks/use-coached"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

function CoachRow({ org }: { org: CoachedOrg }) {
  return (
    <RichListItem className="p-0">
      <Link href={`/coached/coaches/${org.organization_id}`} className="flex w-full min-w-0 items-center gap-4 p-4">
        <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20">
          <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
            {orgInitials(org.organization_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{org.organization_name}</p>
            <StatusBadge status="active" className="text-[10px] font-normal normal-case" />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">@{org.organization_slug}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Coaches</h1>
          <p className="mt-1 text-sm text-muted-foreground">People you learn with</p>
        </div>
        <LoadingRows count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Coaches</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your active coaches and discovery</p>
      </div>

      <Tabs defaultValue={defaultTab}>
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

        <TabsContent value="my" className="mt-4">
          {myCoaches.length > 0 ? (
            <ul className="space-y-3">
              {myCoaches.map((org) => (
                <CoachRow key={org.organization_id} org={org} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="No coaches yet"
              description="Purchase an offer from a coach’s public page to get access."
              action={
                <Button size="sm" variant="secondary" asChild>
                  <Link href="/">Browse offers</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          <div className="rounded-2xl bg-muted/40 p-6">
            <div className="flex flex-col items-center text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium text-foreground">Discover coaches</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Visit coaches’ public pages and purchase an offer to work with them — they will appear
                under My coaches.
              </p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/">Browse public pages</Link>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
