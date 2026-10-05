"use client"

import Link from "next/link"
import { Users, ArrowRight } from "lucide-react"
import { useCoached, type CoachedOrg } from "@/hooks/use-coached"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

function OrgRow({ org }: { org: CoachedOrg }) {
  return (
    <RichListItem className="p-0">
      <Link
        href={`/coached/coaches/${org.organization_id}`}
        className="flex w-full min-w-0 items-center gap-4 p-4"
      >
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
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            @{org.organization_slug}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
  )
}

export default function CoachingCoachesPage() {
  const { coachedOrgs, isLoading } = useCoached()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Places you bought programs from
          </p>
        </div>
        <LoadingRows count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Organizations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizations behind the programs you purchased
        </p>
      </div>

      {coachedOrgs.length > 0 ? (
        <ul className="space-y-3">
          {coachedOrgs.map((org) => (
            <OrgRow key={org.organization_id} org={org} />
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
    </div>
  )
}
