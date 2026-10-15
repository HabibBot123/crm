"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  useCommunityMessages,
  useCreateCommunityMessageMutation,
} from "@/hooks/use-community-dm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import type { CommunityMessage } from "@/schemas/community.schema"
import { cn } from "@/lib/utils"

function formatClock(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const today = startOfLocalDay(new Date())
  const target = startOfLocalDay(date)
  const dayMs = 24 * 60 * 60 * 1000
  if (target === today) return "Today"
  if (target === today - dayMs) return "Yesterday"
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function groupMessagesByDay(messages: CommunityMessage[]) {
  const groups: { label: string; items: CommunityMessage[] }[] = []
  for (const msg of messages) {
    const label = dayLabel(msg.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.items.push(msg)
    } else {
      groups.push({ label, items: [msg] })
    }
  }
  return groups
}

export function CommunityChatThread({
  organizationId,
  conversationId,
  emptyTitle = "No messages yet",
  isPreparing = false,
}: {
  organizationId: number
  conversationId: number | null
  emptyTitle?: string
  isPreparing?: boolean
}) {
  const { user } = useAuth()
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const messagesQuery = useCommunityMessages(conversationId)
  const sendMutation = useCreateCommunityMessageMutation(conversationId)

  const messages = messagesQuery.data ?? []
  const groups = useMemo(() => groupMessagesByDay(messages), [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, conversationId])

  async function sendDraft() {
    if (conversationId == null || !organizationId) return
    const body = draft.trim()
    if (!body || sendMutation.isPending) return
    setDraft("")
    try {
      await sendMutation.mutateAsync({
        organization_id: organizationId,
        conversation_id: conversationId,
        body,
      })
    } catch (err) {
      setDraft(body)
      const message =
        err instanceof Error ? err.message : "Could not send message"
      toast.error(message)
    }
  }

  if (conversationId == null || isPreparing) {
    return (
      <div className="min-h-0 flex-1 p-3">
        <LoadingRows count={3} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {messagesQuery.isLoading ? (
          <LoadingRows count={3} />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {emptyTitle}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex justify-center">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {group.label}
                </span>
              </div>
              {group.items.map((msg) => {
                const mine = msg.author_user_id === user?.id
                const pending = msg.id < 0
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                        pending && "opacity-70"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.body}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[10px] tabular-nums",
                          mine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatClock(msg.created_at)}
                        {pending ? " · Sending" : null}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void sendDraft()
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void sendDraft()
            }
          }}
          placeholder="Write a message"
          maxLength={5000}
          rows={1}
          className="min-h-8 max-h-32 resize-none rounded-xl py-1.5 shadow-none"
        />
        <Button
          type="submit"
          size="sm"
          disabled={sendMutation.isPending || !draft.trim()}
        >
          Send
        </Button>
      </form>
    </div>
  )
}
