"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Layers, Pencil, Users } from "lucide-react"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useCommunitySpaceFeeds } from "@/hooks/use-community"
import { SpaceFeedPanel } from "@/components/coached/space-feed"
import { CreateSpaceDialog } from "@/components/coached/create-space-dialog"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export default function SpacesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isOrgApp, goToHub, ready } = useCoachedHost()
  const { orgSpaces, isLoading, org } = useCurrentCoachedOrg()
  const { can } = useOrgCapabilities({
    organizationId: org?.organization_id ?? null,
  })
  const canManage = can("community.manage")

  const spaceFromQuery = searchParams.get("space")
  const [spaceSlug, setSpaceSlug] = useState<string | null>(null)

  useEffect(() => {
    if (orgSpaces.length === 0) {
      setSpaceSlug(null)
      return
    }
    if (spaceFromQuery && orgSpaces.some((s) => s.slug === spaceFromQuery)) {
      setSpaceSlug(spaceFromQuery)
      return
    }
    setSpaceSlug((prev) => {
      if (prev && orgSpaces.some((s) => s.slug === prev)) return prev
      return orgSpaces[0]?.slug ?? null
    })
  }, [orgSpaces, spaceFromQuery])

  const selectedSpace =
    orgSpaces.find((s) => s.slug === spaceSlug) ?? null

  const feedsQuery = useCommunitySpaceFeeds(selectedSpace?.id ?? null)
  const feeds = useMemo(() => feedsQuery.data ?? [], [feedsQuery.data])
  const [feedSlug, setFeedSlug] = useState<string | null>(null)
  const activeFeedSlug =
    feedSlug && feeds.some((f) => f.slug === feedSlug)
      ? feedSlug
      : (feeds[0]?.slug ?? "")
  const activeFeed =
    feeds.find((f) => f.slug === activeFeedSlug) ?? null

  useEffect(() => {
    setFeedSlug(null)
  }, [selectedSpace?.id])

  function selectSpace(slug: string) {
    setSpaceSlug(slug)
    const params = new URLSearchParams(searchParams.toString())
    params.set("space", slug)
    router.replace(`/s?${params.toString()}`, { scroll: false })
  }

  if (!ready || isLoading) {
    return <LoadingRows count={4} />
  }

  if (!isOrgApp) {
    return (
      <EmptyState
        icon={Layers}
        title="Pick an organization"
        description="Open an organization to see its community spaces."
        action={
          <Button size="sm" onClick={() => goToHub("/home")}>
            Choose organization
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Spaces
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSpace && org ? (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/s/${selectedSpace.slug}/members`}>
                  <Users className="h-4 w-4" />
                  Members
                </Link>
              </Button>
              {canManage ? (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/s/${selectedSpace.slug}/settings`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
            </>
          ) : null}
          {canManage && org ? (
            <CreateSpaceDialog organizationId={org.organization_id} />
          ) : null}
        </div>
      </div>

      {orgSpaces.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No spaces yet"
          description={
            canManage
              ? "Create a space to open the community."
              : org
                ? `${org.organization_name} has not opened a space for you yet.`
                : "No community spaces available."
          }
        />
      ) : (
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="space-y-3 md:hidden">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Space
              </p>
              <Select
                value={selectedSpace?.slug ?? undefined}
                onValueChange={selectSpace}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose space" />
                </SelectTrigger>
                <SelectContent>
                  {orgSpaces.map((s) => (
                    <SelectItem key={s.id} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {feeds.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feed
                </p>
                <Select
                  value={activeFeedSlug || undefined}
                  onValueChange={setFeedSlug}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose feed" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeds.map((feed) => (
                      <SelectItem key={feed.id} value={feed.slug}>
                        {feed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <nav className="hidden w-56 shrink-0 space-y-1 md:block">
            {orgSpaces.map((space) => {
              const isActive = selectedSpace?.slug === space.slug
              return (
                <div key={space.id} className="space-y-0.5">
                  <button
                    type="button"
                    title={space.name}
                    onClick={() => selectSpace(space.slug)}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span className="truncate">{space.name}</span>
                  </button>
                  {isActive ? (
                    feedsQuery.isLoading ? (
                      <div className="px-3 py-1">
                        <LoadingRows count={1} />
                      </div>
                    ) : (
                      <ul className="space-y-0.5 pb-1 pl-3">
                        {feeds.map((feed) => {
                          const feedActive = feed.slug === activeFeedSlug
                          return (
                            <li key={feed.id}>
                              <button
                                type="button"
                                title={feed.name}
                                onClick={() => setFeedSlug(feed.slug)}
                                className={cn(
                                  "flex w-full min-w-0 items-center rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                                  feedActive
                                    ? "font-medium text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <span className="truncate">{feed.name}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )
                  ) : null}
                </div>
              )
            })}
          </nav>

          <div className="min-w-0 flex-1 space-y-4">
            {selectedSpace && org ? (
              <>
                {selectedSpace.description?.trim() ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedSpace.description}
                  </p>
                ) : null}

                {feedsQuery.isLoading ? (
                  <LoadingRows count={3} />
                ) : !activeFeed ? (
                  <EmptyState
                    icon={Layers}
                    title="No feeds yet"
                    description={
                      canManage
                        ? "Add feeds in space settings."
                        : "This space has no feeds configured."
                    }
                    action={
                      canManage ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/s/${selectedSpace.slug}/settings`}>
                            Open settings
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <SpaceFeedPanel
                    organizationId={org.organization_id}
                    spaceId={selectedSpace.id}
                    feed={activeFeed}
                  />
                )}
              </>
            ) : (
              <EmptyState
                icon={Layers}
                title="Select a space"
                description="Choose a space from the list."
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
