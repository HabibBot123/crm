"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import {
  useGetOrCreateCommunityDmMutation,
  useMyCommunityConversations,
} from "@/hooks/use-community-dm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { CommunityChatThread } from "@/components/coached/community-chat-thread"
import { cn } from "@/lib/utils"

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function OrgMessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { org, isLoading: orgLoading, ready } = useCurrentCoachedOrg()
  const orgId = org?.organization_id ?? null

  const withUser = searchParams.get("with")
  const conversationFromQuery = searchParams.get("c")
  const conversationIdFromQuery = conversationFromQuery
    ? Number(conversationFromQuery)
    : null

  const [activeId, setActiveId] = useState<number | null>(null)

  const conversationsQuery = useMyCommunityConversations(orgId)
  const openDmMutation = useGetOrCreateCommunityDmMutation(orgId)

  useEffect(() => {
    if (
      conversationIdFromQuery != null &&
      Number.isFinite(conversationIdFromQuery)
    ) {
      setActiveId(conversationIdFromQuery)
    }
  }, [conversationIdFromQuery])

  const openedWithRef = useRef<string | null>(null)
  useEffect(() => {
    if (!orgId || !withUser) return
    if (openedWithRef.current === withUser) return
    openedWithRef.current = withUser
    void openDmMutation
      .mutateAsync(withUser)
      .then((conv) => {
        setActiveId(conv.id)
        router.replace(`/messages?c=${conv.id}`, { scroll: false })
      })
      .catch((err: unknown) => {
        openedWithRef.current = null
        const message =
          err instanceof Error ? err.message : "Could not open conversation"
        toast.error(message)
      })
  }, [orgId, withUser, openDmMutation, router])

  const conversations = conversationsQuery.data ?? []
  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  )

  function selectConversation(id: number) {
    setActiveId(id)
    router.replace(`/messages?c=${id}`, { scroll: false })
  }

  if (!ready || orgLoading) {
    return <LoadingRows count={4} />
  }

  if (!org) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Pick an organization"
        description="Open an organization to message members."
      />
    )
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-4 lg:h-[calc(100dvh-6rem)]">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Direct messages in {org.organization_name}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <aside
          className={cn(
            "w-full shrink-0 border-border md:w-72 md:border-r lg:w-80",
            activeId != null ? "hidden md:block" : "block"
          )}
        >
          {conversationsQuery.isLoading ? (
            <div className="p-3">
              <LoadingRows count={4} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                description="Open a member profile card and tap Message."
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
            <ul className="overflow-y-auto">
              {conversations.map((conv) => {
                const selected = conv.id === activeId
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(conv.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        selected ? "bg-accent" : "hover:bg-accent/60"
                      )}
                    >
                      <Avatar className="h-9 w-9 border border-border">
                        {conv.other_avatar_url ? (
                          <AvatarImage src={conv.other_avatar_url} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {initials(conv.other_full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {conv.other_full_name?.trim() || "Member"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {conv.last_body?.trim() || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            activeId == null ? "hidden md:flex" : "flex"
          )}
        >
          {activeId == null ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                Select a conversation
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="md:hidden"
                  onClick={() => {
                    setActiveId(null)
                    router.replace("/messages", { scroll: false })
                  }}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8 border border-border">
                  {active?.other_avatar_url ? (
                    <AvatarImage src={active.other_avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-xs font-semibold">
                    {initials(active?.other_full_name)}
                  </AvatarFallback>
                </Avatar>
                <p className="truncate text-sm font-semibold">
                  {active?.other_full_name?.trim() || "Member"}
                </p>
              </div>

              <CommunityChatThread
                organizationId={org.organization_id}
                conversationId={activeId}
                emptyTitle="No messages yet"
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
