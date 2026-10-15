"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useGetOrCreateCommunityDmMutation } from "@/hooks/use-community-dm"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { CommunityChatThread } from "@/components/coached/community-chat-thread"

export function CoachingPackChat({
  organizationId,
  otherUserId,
  emptyTitle,
}: {
  organizationId: number
  otherUserId: string | null
  emptyTitle: string
}) {
  const openDm = useGetOrCreateCommunityDmMutation(organizationId)
  const [conversationId, setConversationId] = useState<number | null>(null)

  useEffect(() => {
    if (!otherUserId) {
      setConversationId(null)
      return
    }
    let cancelled = false
    setConversationId(null)
    void openDm
      .mutateAsync(otherUserId)
      .then((conv) => {
        if (!cancelled) setConversationId(conv.id)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Could not open chat"
        toast.error(message)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, otherUserId])

  if (!otherUserId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{emptyTitle}</p>
      </div>
    )
  }

  if (conversationId == null && openDm.isPending) {
    return (
      <div className="min-h-0 flex-1 p-3">
        <LoadingRows count={3} />
      </div>
    )
  }

  return (
    <CommunityChatThread
      organizationId={organizationId}
      conversationId={conversationId}
      emptyTitle="No messages yet"
      isPreparing={conversationId == null}
    />
  )
}
