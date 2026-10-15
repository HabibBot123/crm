"use client"

import { useEffect, useMemo } from "react"
import { Calendar } from "lucide-react"
import { useCoached } from "@/hooks/use-coached"
import { useOrgCoachingInbox } from "@/hooks/use-org-coaching-inbox"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useCoachedCommunityOrgs } from "@/hooks/use-community"
import {
  ClientPackRow,
  CoachPackRow,
} from "@/components/coached/coaching-pack-rows"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { resolveCoachedOrgSlug } from "@/lib/coached-last-org"

export default function CoachingPage() {
  const { ready, isOrgApp, isHub, goToOrg, goToHub } = useCoachedHost()
  const { coachedOrgs, isLoading } = useCoached()
  const communityOrgs = useCoachedCommunityOrgs()
  const { org, isLoading: orgLoading } = useCurrentCoachedOrg()
  const inbox = useOrgCoachingInbox(org?.organization_id ?? null)

  const orgSlugsKey = useMemo(() => {
    const slugs = new Set<string>()
    for (const o of coachedOrgs) slugs.add(o.organization_slug)
    for (const o of communityOrgs.data ?? []) slugs.add(o.organization_slug)
    return Array.from(slugs).join(",")
  }, [coachedOrgs, communityOrgs.data])

  const listsReady = !isLoading && !communityOrgs.isLoading
  const hubTarget = useMemo(() => {
    if (!isHub || !listsReady) return null
    const slugs = orgSlugsKey ? orgSlugsKey.split(",") : []
    return resolveCoachedOrgSlug(slugs)
  }, [isHub, listsReady, orgSlugsKey])

  useEffect(() => {
    if (!ready || !isHub || !listsReady) return
    if (hubTarget) {
      goToOrg(hubTarget, "/coaching")
      return
    }
    goToHub("/home?pick=1")
  }, [ready, isHub, listsReady, hubTarget, goToOrg, goToHub])

  if (
    !ready ||
    isHub ||
    isLoading ||
    (isOrgApp && orgLoading) ||
    inbox.isLoading
  ) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <LoadingRows count={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Coaching
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {org
            ? `Coaching in ${org.organization_name}`
            : "Coaching in this organization"}
        </p>
      </div>

      {inbox.isEmpty ? (
        <EmptyState
          icon={Calendar}
          title="No coaching packs"
          description="Your client packs and assigned clients appear here."
        />
      ) : (
        <ul className="space-y-3">
          {inbox.asClient.map((p) => (
            <ClientPackRow
              key={`client-${p.enrollment_product_id}`}
              product={p}
            />
          ))}
          {inbox.asCoach.map((p) => (
            <CoachPackRow key={`coach-${p.enrollment_product_id}`} pack={p} />
          ))}
        </ul>
      )}
    </div>
  )
}
