"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Check,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useCoachedHost } from "@/hooks/use-coached-host"
import {
  deleteCoachedSession,
  fetchCoachedCoachingDetail,
  updateCoachedSession,
} from "@/lib/services/coached"
import { createCoachingSession } from "@/lib/services/coaching"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { CoachingPackChat } from "@/components/coached/coaching-pack-chat"
import { CreateCoachedSessionDialog } from "@/components/coached/create-coached-session-dialog"
import { EditCoachedSessionDialog } from "@/components/coached/edit-coached-session-dialog"
import { CoachedSessionNoteDialog } from "@/components/coached/coached-session-note-dialog"
import {
  deliveryStatus,
  externalHref,
  formatProductDate,
  formatSessionDateTime,
  formatDuration,
} from "@/lib/coached"
import type {
  CoachedCoachingDetail,
  CoachedCoachingSession,
} from "@/lib/services/coached"
import { cn } from "@/lib/utils"

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const COACHED_DELIVERY_BADGE: Record<string, string> = {
  remote: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  in_person: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  hybrid: "border-chart-5/20 bg-chart-5/10 text-chart-5",
}

function coachedDeliveryBadgeClass(mode: string): string {
  const key = mode.toLowerCase()
  return (
    COACHED_DELIVERY_BADGE[key] ?? "border-border bg-muted text-muted-foreground"
  )
}

export default function CoachedCoachingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const enrollmentProductId = Number(id)
  const { supabase, user } = useAuth()
  const { orgSlug } = useCoachedHost()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState("sessions")
  const [editSession, setEditSession] = useState<CoachedCoachingSession | null>(
    null
  )
  const [noteSession, setNoteSession] = useState<CoachedCoachingSession | null>(
    null
  )

  const { data: detail = null, isLoading } = useQuery({
    queryKey: ["coached-coaching", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || !enrollmentProductId) {
        throw new Error(
          "Cannot fetch coaching detail without user id and enrollment product id"
        )
      }
      return fetchCoachedCoachingDetail(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && !!enrollmentProductId,
  })

  const orgMatches =
    detail != null &&
    (orgSlug == null || detail.organization_slug === orgSlug)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  if (!detail || !orgMatches) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">
          Program not found or you don&apos;t have access
        </p>
        <Link href="/coaching">
          <Button variant="outline" className="mt-4">
            Back to coaching
          </Button>
        </Link>
      </div>
    )
  }

  const chatPeerId =
    detail.viewer_role === "client"
      ? detail.coach_user_id
      : detail.client_user_id
  const chatEmpty =
    detail.viewer_role === "client"
      ? "No coach assigned yet."
      : "Client has no account yet."
  const sessionCount =
    detail.sessions_upcoming.length + detail.sessions_past.length
  const quotaReached =
    detail.product_completed_at != null ||
    (detail.completion_total != null &&
      detail.completion_total > 0 &&
      (sessionCount >= detail.completion_total ||
        (detail.completion_completed ?? 0) >= detail.completion_total))
  const canCreateSession =
    detail.coaching_assignment_id != null &&
    detail.client_user_id != null &&
    !quotaReached

  async function refreshSessions() {
    await queryClient.invalidateQueries({
      queryKey: ["coached-coaching", userId, enrollmentProductId],
    })
  }

  async function handleDeleteSession(sessionId: number) {
    if (!window.confirm("Delete this session?")) return
    try {
      await deleteCoachedSession(supabase, sessionId)
      toast.success("Session deleted")
      await refreshSessions()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete session"
      toast.error(message)
    }
  }

  async function handleToggleComplete(
    session: CoachedCoachingSession,
    completed: boolean
  ) {
    try {
      await updateCoachedSession(supabase, session.id, {
        completed_at: completed ? new Date().toISOString() : null,
      })
      toast.success(completed ? "Session completed" : "Marked as upcoming")
      await refreshSessions()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update session"
      toast.error(message)
    }
  }

  const chatPeerName =
    detail.viewer_role === "coach"
      ? detail.client_full_name
      : detail.coach_full_name
  const chatPeerAvatar =
    detail.viewer_role === "coach"
      ? detail.client_avatar_url
      : detail.coach_avatar_url

  const tabSwitcher = (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
      {(
        [
          ["sessions", "Sessions", Calendar],
          ["chat", "Chat", User],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
            tab === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setTab(key)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )

  const sessionAction =
    tab === "sessions" ? (
      <Button
        type="button"
        size="sm"
        disabled={!canCreateSession}
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Session
      </Button>
    ) : null

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex h-[calc(100dvh-11rem)] min-h-0 flex-col gap-3 md:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-6rem)] lg:gap-4"
    >
      <div className="shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/coaching">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              {detail.product_title}
            </h1>
            {detail.completion_total != null && detail.completion_total > 0 ? (
              <p className="text-sm text-muted-foreground">
                {detail.completion_completed ?? 0}/{detail.completion_total}{" "}
                sessions
              </p>
            ) : null}
          </div>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {sessionAction}
            {tabSwitcher}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 lg:hidden">
          {sessionAction}
          {tabSwitcher}
        </div>
      </div>

      <TabsContent
        value="sessions"
        className="mt-0 min-h-0 flex-1 space-y-4 overflow-y-auto outline-none"
      >
        <CounterpartBanner detail={detail} />
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming
            </p>
            {detail.sessions_upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming sessions.
              </p>
            ) : (
              <ul className="space-y-2">
                {detail.sessions_upcoming.map((s) => (
                  <li key={s.id}>
                    <SessionRow
                      session={s}
                      viewerRole={detail.viewer_role}
                      onEdit={() => setEditSession(s)}
                      onNote={() => setNoteSession(s)}
                      onToggleComplete={() =>
                        void handleToggleComplete(s, s.completed_at == null)
                      }
                      onDelete={() =>
                        void handleDeleteSession(s.id)
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Past
            </p>
            {detail.sessions_past.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past sessions.</p>
            ) : (
              <ul className="space-y-2">
                {detail.sessions_past.map((s) => (
                  <li key={s.id}>
                    <SessionRow
                      session={s}
                      viewerRole={detail.viewer_role}
                      onEdit={() => setEditSession(s)}
                      onNote={() => setNoteSession(s)}
                      onToggleComplete={() =>
                        void handleToggleComplete(s, s.completed_at == null)
                      }
                      onDelete={() =>
                        void handleDeleteSession(s.id)
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value="chat"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card outline-none data-[state=inactive]:hidden"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <Avatar className="h-8 w-8 border border-border">
            {chatPeerAvatar ? (
              <AvatarImage src={chatPeerAvatar} alt="" />
            ) : null}
            <AvatarFallback className="bg-muted text-xs font-semibold">
              {initials(chatPeerName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {chatPeerName?.trim() ||
                (detail.viewer_role === "coach" ? "Client" : "Coach")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {detail.viewer_role === "coach" ? "Client chat" : "Coach chat"}
            </p>
          </div>
        </div>
        <CoachingPackChat
          organizationId={detail.organization_id}
          otherUserId={chatPeerId}
          emptyTitle={chatEmpty}
        />
      </TabsContent>

      <CreateCoachedSessionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={detail.organization_id}
        enrollmentProductId={detail.enrollment_product_id}
        coachingAssignmentId={detail.coaching_assignment_id}
        clientUserId={detail.client_user_id}
        onCreate={async (payload) => {
          await createCoachingSession(supabase, payload)
          await refreshSessions()
        }}
      />
      <EditCoachedSessionDialog
        open={editSession != null}
        onOpenChange={(open) => {
          if (!open) setEditSession(null)
        }}
        session={editSession}
        onSave={async (input) => {
          if (editSession == null) return
          await updateCoachedSession(supabase, editSession.id, input)
          await refreshSessions()
        }}
      />
      <CoachedSessionNoteDialog
        open={noteSession != null}
        onOpenChange={(open) => {
          if (!open) setNoteSession(null)
        }}
        session={noteSession}
        onSave={async (input) => {
          if (noteSession == null) return
          await updateCoachedSession(supabase, noteSession.id, input)
          await refreshSessions()
        }}
      />
    </Tabs>
  )
}

function CounterpartBanner({ detail }: { detail: CoachedCoachingDetail }) {
  const isCoach = detail.viewer_role === "coach"
  const name = isCoach ? detail.client_full_name : detail.coach_full_name
  const email = isCoach ? detail.client_email : detail.coach_email
  const avatarUrl = isCoach ? detail.client_avatar_url : detail.coach_avatar_url
  const roleLabel = isCoach ? "Client" : "Coach"
  const sinceLabel = isCoach
    ? detail.started_at
      ? `Enrolled ${formatProductDate(detail.started_at)}`
      : null
    : detail.assigned_at
      ? `Coach since ${formatProductDate(detail.assigned_at)}`
      : null
  const packLine =
    detail.offer_title && detail.offer_title !== detail.product_title
      ? `${detail.product_title} · ${detail.offer_title}`
      : detail.product_title

  if (!name && !email && !detail.coach_user_id && !detail.client_user_id) {
    return (
      <div className="rounded-xl border border-border bg-card px-3 py-3">
        <p className="text-sm text-muted-foreground">
          {isCoach ? "No client account yet." : "No coach assigned yet."}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3">
      <Avatar className="h-10 w-10 border border-border">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-muted text-xs font-semibold">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {name?.trim() || roleLabel}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-normal normal-case",
              isCoach
                ? "border-chart-4/20 bg-chart-4/10 text-chart-4"
                : "border-chart-3/20 bg-chart-3/10 text-chart-3"
            )}
          >
            {roleLabel}
          </Badge>
          {detail.enrollment_status ? (
            <StatusBadge
              status={deliveryStatus(
                detail.enrollment_status,
                detail.product_completed_at
              )}
              className="text-[10px] font-normal"
              configs={{
                expired: { label: "Expired", variant: "destructive" },
                paused: { label: "Paused", variant: "warning" },
                completed: { label: "Completed", variant: "info" },
              }}
            />
          ) : null}
        </div>
        {email ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
        ) : null}
        <p className="mt-1 truncate text-xs text-muted-foreground">{packLine}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          {sinceLabel ? <span>{sinceLabel}</span> : null}
          {isCoach && detail.expires_at ? (
            <span>Expires {formatProductDate(detail.expires_at)}</span>
          ) : null}
          {detail.completion_total != null && detail.completion_total > 0 ? (
            <span>
              {detail.completion_completed ?? 0}/{detail.completion_total}{" "}
              sessions
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SessionRow({
  session,
  viewerRole,
  onEdit,
  onNote,
  onToggleComplete,
  onDelete,
}: {
  session: CoachedCoachingSession
  viewerRole: "client" | "coach"
  onEdit: () => void
  onNote: () => void
  onToggleComplete: () => void
  onDelete: () => void
}) {
  const completed = session.completed_at != null
  const canEdit = !completed
  const canDelete = viewerRole === "coach"

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {formatSessionDateTime(session.scheduled_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDuration(session.duration_minutes)}
            </span>
          </div>
          {session.delivery_mode || completed ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {session.delivery_mode ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-normal capitalize",
                    coachedDeliveryBadgeClass(session.delivery_mode)
                  )}
                >
                  {session.delivery_mode.replace("_", " ")}
                </Badge>
              ) : null}
              {completed ? (
                <Badge
                  variant="outline"
                  className="border-success/20 bg-success/10 text-[10px] font-normal normal-case text-success"
                >
                  <Check className="mr-0.5 h-3 w-3" />
                  Completed
                </Badge>
              ) : null}
            </div>
          ) : null}
          {(() => {
            const meetingHref = externalHref(session.meeting_url)
            if (!meetingHref) return null
            return (
              <a
                href={meetingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Video className="h-3 w-3" />
                Video link
              </a>
            )
          })()}
          {session.location ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {session.location}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {completed ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggleComplete}
              aria-label="Mark as upcoming"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-success"
              onClick={onToggleComplete}
              aria-label="Mark as completed"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onNote}
            aria-label="Session note"
          >
            <FileText className="h-4 w-4" />
          </Button>
          {canEdit ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Edit session"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
