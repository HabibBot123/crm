"use client"

import { useEffect, useState } from "react"
import { Archive, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  useArchiveCommunityFeedMutation,
  useCommunitySpaceFeeds,
  useCreateCommunityFeedMutation,
  useUpdateCommunityFeedMutation,
} from "@/hooks/use-community"
import type { CommunityFeed, CommunityFeedWhoCanPost } from "@/schemas/community.schema"
import { communityFeedWhoCanPostSchema } from "@/schemas/community.schema"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const WHO_LABEL: Record<CommunityFeedWhoCanPost, string> = {
  admins: "Admins only",
  all: "Everyone",
}

function parseWhoCanPost(value: string): CommunityFeedWhoCanPost {
  return communityFeedWhoCanPostSchema.parse(value)
}

function FeedRow({
  feed,
  spaceId,
}: {
  feed: CommunityFeed
  spaceId: number
}) {
  const updateMutation = useUpdateCommunityFeedMutation(spaceId)
  const archiveMutation = useArchiveCommunityFeedMutation(spaceId)
  const [name, setName] = useState(feed.name)
  const [whoCanPost, setWhoCanPost] = useState<CommunityFeedWhoCanPost>(
    feed.who_can_post
  )

  useEffect(() => {
    setName(feed.name)
    setWhoCanPost(feed.who_can_post)
  }, [feed.id, feed.name, feed.who_can_post])

  const dirty =
    name.trim() !== feed.name || whoCanPost !== feed.who_can_post

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    try {
      await updateMutation.mutateAsync({
        feed_id: feed.id,
        name: trimmed,
        who_can_post: whoCanPost,
      })
      toast.success("Feed updated")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update feed"
      toast.error(message)
    }
  }

  async function handleArchive() {
    try {
      await archiveMutation.mutateAsync(feed.id)
      toast.success("Feed archived")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not archive feed"
      toast.error(message)
    }
  }

  return (
    <li className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={`feed-name-${feed.id}`}>Name</Label>
          <Input
            id={`feed-name-${feed.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label htmlFor={`feed-who-${feed.id}`}>Who can post</Label>
          <Select
            value={whoCanPost}
            onValueChange={(v) => setWhoCanPost(parseWhoCanPost(v))}
          >
            <SelectTrigger id={`feed-who-${feed.id}`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{WHO_LABEL.all}</SelectItem>
              <SelectItem value="admins">{WHO_LABEL.admins}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || updateMutation.isPending}
            onClick={() => void handleSave()}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={archiveMutation.isPending}
            onClick={() => void handleArchive()}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>
    </li>
  )
}

type SpaceFeedsSettingsProps = {
  spaceId: number
  organizationId: number
}

export function SpaceFeedsSettings({
  spaceId,
  organizationId,
}: SpaceFeedsSettingsProps) {
  const feedsQuery = useCommunitySpaceFeeds(spaceId)
  const createMutation = useCreateCommunityFeedMutation(spaceId)
  const [name, setName] = useState("")
  const [whoCanPost, setWhoCanPost] =
    useState<CommunityFeedWhoCanPost>("all")

  const feeds = feedsQuery.data ?? []

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    try {
      await createMutation.mutateAsync({
        organization_id: organizationId,
        name: trimmed,
        who_can_post: whoCanPost,
      })
      setName("")
      setWhoCanPost("all")
      toast.success("Feed created")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create feed"
      toast.error(message)
    }
  }

  return (
    <SectionCard title="Feeds">
      <div className="space-y-4">
        {feedsQuery.isLoading ? (
          <LoadingRows count={2} />
        ) : feeds.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No feeds yet"
            description="Add a feed for this space."
          />
        ) : (
          <ul className="space-y-2">
            {feeds.map((feed) => (
              <FeedRow key={feed.id} feed={feed} spaceId={spaceId} />
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New feed
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="new-feed-name">Name</Label>
              <Input
                id="new-feed-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Questions"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-44">
              <Label htmlFor="new-feed-who">Who can post</Label>
              <Select
                value={whoCanPost}
                onValueChange={(v) => setWhoCanPost(parseWhoCanPost(v))}
              >
                <SelectTrigger id="new-feed-who" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{WHO_LABEL.all}</SelectItem>
                  <SelectItem value="admins">{WHO_LABEL.admins}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => void handleCreate()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
