"use client"

import { useMemo, useState } from "react"
import { Heart, MessageCircle, Newspaper, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  useCanPostToCommunityFeed,
  useCommunityFeedPosts,
  useCommunityPostComments,
  useCreateCommunityPostCommentMutation,
  useCreateCommunityPostMutation,
  useIsCommunitySpaceStaff,
  useSoftDeleteCommunityPostCommentMutation,
  useSoftDeleteCommunityPostMutation,
  useToggleCommunityPostLikeMutation,
} from "@/hooks/use-community"
import type {
  CommunityFeed,
  CommunityPost,
  CommunityPostComment,
} from "@/schemas/community.schema"
import { displayNameFromUser } from "@/lib/user-display"
import { getInitials } from "@/components/dashboard/user-avatar"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function formatPostTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function AuthorAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const initials = getInitials(name, null)
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}

function PostCommentsPanel({
  post,
  isStaff,
  open,
}: {
  post: CommunityPost
  isStaff: boolean
  open: boolean
}) {
  const { user } = useAuth()
  const [body, setBody] = useState("")
  const commentsQuery = useCommunityPostComments(post.id, open)
  const createMutation = useCreateCommunityPostCommentMutation(post.id)
  const deleteMutation = useSoftDeleteCommunityPostCommentMutation(post.id)

  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [commentsQuery.data]
  )

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error("Write a comment first")
      return
    }
    try {
      await createMutation.mutateAsync({
        post_id: post.id,
        organization_id: post.organization_id,
        space_id: post.space_id,
        body: trimmed,
      })
      setBody("")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not comment"
      toast.error(message)
    }
  }

  async function handleDelete(comment: CommunityPostComment) {
    try {
      await deleteMutation.mutateAsync(comment.id)
      toast.success("Comment removed")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete comment"
      toast.error(message)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {commentsQuery.isLoading ? (
        <LoadingRows count={2} />
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => {
            const name = comment.author_full_name?.trim() || "Member"
            const canDelete =
              comment.author_user_id === user?.id || isStaff
            return (
              <li
                key={comment.id}
                className="rounded-lg border border-border bg-muted/50 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <AuthorAvatar
                    name={name}
                    avatarUrl={comment.author_avatar_url}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPostTime(comment.created_at)}
                        </p>
                      </div>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground"
                          disabled={deleteMutation.isPending}
                          onClick={() => void handleDelete(comment)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {commentsQuery.hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={commentsQuery.isFetchingNextPage}
          onClick={() => void commentsQuery.fetchNextPage()}
        >
          {commentsQuery.isFetchingNextPage
            ? "Loading…"
            : "Load more comments"}
        </Button>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          className="min-h-16 resize-none"
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={createMutation.isPending || !body.trim()}
          >
            Comment
          </Button>
        </div>
      </form>
    </div>
  )
}

function PostCard({
  post,
  canDelete,
  onDelete,
  deleting,
  onToggleLike,
  likePending,
  isStaff,
}: {
  post: CommunityPost
  canDelete: boolean
  onDelete: () => void
  deleting: boolean
  onToggleLike: () => void
  likePending: boolean
  isStaff: boolean
}) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const name = post.author_full_name?.trim() || "Member"
  const liked = post.liked_by_me === true
  const commentCount = post.comment_count ?? 0

  return (
    <article className="rounded-xl bg-card p-4">
      <div className="flex items-start gap-3">
        <AuthorAvatar name={name} avatarUrl={post.author_avatar_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatPostTime(post.created_at)}
              </p>
            </div>
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                disabled={deleting}
                onClick={onDelete}
                aria-label="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {post.body}
          </p>
          <div className="mt-2 flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-muted-foreground"
              disabled={likePending}
              onClick={onToggleLike}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  liked ? "fill-primary text-primary" : undefined
                )}
              />
              {post.like_count ?? 0}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-muted-foreground"
              onClick={() => setCommentsOpen((v) => !v)}
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount}
              <span>{commentsOpen ? "Hide" : "Comments"}</span>
            </Button>
          </div>
          <PostCommentsPanel
            post={post}
            isStaff={isStaff}
            open={commentsOpen}
          />
        </div>
      </div>
    </article>
  )
}

function PostComposer({
  organizationId,
  spaceId,
  feed,
}: {
  organizationId: number
  spaceId: number
  feed: CommunityFeed
}) {
  const canPostQuery = useCanPostToCommunityFeed(feed.id)
  const createMutation = useCreateCommunityPostMutation(feed.id)
  const [body, setBody] = useState("")
  const canPost = canPostQuery.data === true

  if (canPostQuery.isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
    )
  }

  if (!canPost) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Only admins can post in {feed.name}.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error("Write something first")
      return
    }
    try {
      await createMutation.mutateAsync({
        organization_id: organizationId,
        space_id: spaceId,
        feed_id: feed.id,
        body: trimmed,
      })
      setBody("")
      toast.success("Posted")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not post"
      toast.error(message)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-border bg-card p-3"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Post in ${feed.name}…`}
        className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
        maxLength={5000}
      />
      <div className="mt-2 flex items-center justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || !body.trim()}
        >
          {createMutation.isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  )
}

export function SpaceFeedPanel({
  organizationId,
  spaceId,
  feed,
}: {
  organizationId: number
  spaceId: number
  feed: CommunityFeed
}) {
  const { user } = useAuth()
  const postsQuery = useCommunityFeedPosts(feed.id)
  const staffQuery = useIsCommunitySpaceStaff(spaceId)
  const deleteMutation = useSoftDeleteCommunityPostMutation(feed.id)
  const likeMutation = useToggleCommunityPostLikeMutation(feed.id)
  const myName = displayNameFromUser(user)
  const isStaff = staffQuery.data === true

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [postsQuery.data]
  )

  if (postsQuery.isLoading) {
    return <LoadingRows count={3} />
  }

  return (
    <div className="space-y-3">
      <PostComposer
        organizationId={organizationId}
        spaceId={spaceId}
        feed={feed}
      />
      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description={
            myName
              ? `Be the first to share something in ${feed.name}.`
              : `Nothing in ${feed.name} yet.`
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  isStaff={isStaff}
                  canDelete={post.author_user_id === user?.id || isStaff}
                  deleting={deleteMutation.isPending}
                  likePending={likeMutation.isPending}
                  onToggleLike={() => {
                    void likeMutation
                      .mutateAsync({
                        post_id: post.id,
                        organization_id: post.organization_id,
                        space_id: post.space_id,
                        liked: !(post.liked_by_me === true),
                      })
                      .catch((err: unknown) => {
                        const message =
                          err instanceof Error
                            ? err.message
                            : "Could not update like"
                        toast.error(message)
                      })
                  }}
                  onDelete={() => {
                    void deleteMutation.mutateAsync(post.id).then(
                      () => toast.success("Post removed"),
                      (err: unknown) => {
                        const message =
                          err instanceof Error
                            ? err.message
                            : "Could not delete"
                        toast.error(message)
                      }
                    )
                  }}
                />
              </li>
            ))}
          </ul>
          {postsQuery.hasNextPage ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={postsQuery.isFetchingNextPage}
                onClick={() => void postsQuery.fetchNextPage()}
              >
                {postsQuery.isFetchingNextPage ? "Loading…" : "Load older posts"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
