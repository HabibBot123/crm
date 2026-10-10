"use client"

import type { ReactNode } from "react"
import { Check, MapPin, Plus, Video } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import type { CoachingEnrollmentProduct, CoachingSessionRow } from "@/lib/services/coaching"

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${m}` : `${h}h`
}

function emptySessionsHint(
  pack: CoachingEnrollmentProduct | null,
  canLog: boolean,
  enrollmentLiving: boolean
): string {
  if (canLog) return "Log a session to track delivery."
  if (!enrollmentLiving) return "Enrollment is no longer active."
  if (pack?.coach_full_name == null) return "Assign a coach first."
  if (pack.user_id == null) return "Waiting for client signup."
  return "No sessions logged yet."
}

export function PackSessionsSheet({
  pack,
  open,
  onOpenChange,
  sessions,
  sessionsLoading,
  canComplete,
  canCreateSession,
  canEditCoach,
  actionPending,
  completePending,
  onComplete,
  onLogSession,
  onChangeCoach,
  onRemoveCoach,
}: {
  pack: CoachingEnrollmentProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: CoachingSessionRow[]
  sessionsLoading: boolean
  canComplete: boolean
  canCreateSession: boolean
  canEditCoach: boolean
  actionPending: boolean
  completePending: boolean
  onComplete: (sessionId: number, completed: boolean) => void
  onLogSession: () => void
  onChangeCoach: () => void
  onRemoveCoach: () => void
}) {
  const enrollmentLiving =
    pack != null &&
    (pack.enrollment_status === "active" || pack.enrollment_status === "paused")
  const waitingSignup =
    enrollmentLiving && pack.coach_full_name != null && pack.user_id == null
  const canLog =
    canCreateSession &&
    enrollmentLiving &&
    pack.coach_full_name != null &&
    pack.user_id != null

  const headerMeta = pack
    ? [pack.user_full_name, pack.coach_full_name].filter(Boolean).join(" · ")
    : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>Sessions</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {pack ? (
            <>
              <div className="space-y-2 border-b border-border pb-4 pr-10">
                <h3 className="text-lg font-semibold leading-tight text-foreground">
                  {pack.product_title}
                </h3>
                {headerMeta ? (
                  <p className="text-sm text-muted-foreground">{headerMeta}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={pack.enrollment_status} />
                  {waitingSignup ? (
                    <StatusBadge
                      status="waiting_signup"
                      configs={{
                        waiting_signup: {
                          label: "Waiting for signup",
                          variant: "muted",
                        },
                      }}
                    />
                  ) : null}
                  {pack.completion_total != null ? (
                    <span className="text-xs text-muted-foreground">
                      {pack.completion_completed ?? 0} / {pack.completion_total} sessions
                    </span>
                  ) : null}
                </div>
              </div>

              {pack.coach_full_name != null || canEditCoach ? (
                <section className="space-y-3">
                  <SectionLabel>Coach</SectionLabel>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-sm text-foreground">
                      {pack.coach_full_name ?? "Unassigned"}
                    </p>
                    {canEditCoach ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionPending}
                          onClick={onChangeCoach}
                        >
                          Change
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionPending}
                          onClick={onRemoveCoach}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>Sessions</SectionLabel>
                  {canLog ? (
                    <Button size="sm" onClick={onLogSession}>
                      <Plus className="mr-1 h-4 w-4" />
                      Log session
                    </Button>
                  ) : null}
                </div>

                {sessionsLoading ? (
                  <LoadingRows count={3} />
                ) : sessions.length === 0 ? (
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-sm font-medium text-foreground">No sessions</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {emptySessionsHint(pack, canLog, enrollmentLiving)}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((session) => {
                      const isCompleted = session.completed_at != null
                      return (
                        <li
                          key={session.id}
                          className="rounded-lg border border-border bg-muted/50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {formatDate(session.scheduled_at)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatDuration(session.duration_minutes)}
                                {session.delivery_mode
                                  ? ` · ${session.delivery_mode}`
                                  : ""}
                                {session.coach_display
                                  ? ` · ${session.coach_display}`
                                  : ""}
                              </p>
                              {session.meeting_url ? (
                                <a
                                  href={session.meeting_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Video className="h-3 w-3" />
                                  Video link
                                </a>
                              ) : null}
                              {session.location ? (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {session.location}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0">
                              {isCompleted ? (
                                <StatusBadge
                                  status="completed"
                                  configs={{
                                    completed: {
                                      label: "Completed",
                                      variant: "success",
                                    },
                                  }}
                                />
                              ) : canComplete ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={completePending}
                                  onClick={() => onComplete(session.id, true)}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Done
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
