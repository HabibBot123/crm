"use client"

import { useState, useCallback, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  MessageCircle,
  Calendar,
  Check,
  Plus,
  Video,
  MapPin,
  UserX,
  Search,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useAuth } from "@/hooks/use-auth"
import {
  useCoachingPacks,
  useCoachingSessions,
  useTeamMembersForAssign,
  useAssignCoachMutation,
  useCompleteSessionMutation,
} from "@/hooks/use-coaching"
import {
  getCoachingAssignmentForEnrollmentProduct,
  createCoachingSession,
  type CoachingEnrollmentProduct,
  type CoachingSessionRow,
} from "@/lib/services/coaching"
import { CreateSessionDialog } from "@/components/dashboard/coaching/create-session-dialog"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/dashboard/page-header"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"

const PACKS_PAGE_SIZE = 10
const SESSIONS_PAGE_SIZE = 10

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

export default function CoachingPage() {
  const { supabase } = useAuth()
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const queryClient = useQueryClient()
  const [sessionDialogPack, setSessionDialogPack] = useState<CoachingEnrollmentProduct | null>(null)
  const [packsPage, setPacksPage] = useState(1)
  const [sessionsPage, setSessionsPage] = useState(1)
  const orgId = currentOrganization?.id ?? null

  const { data: packs = [], total: packsTotal = 0, isLoading: packsLoading } = useCoachingPacks({
    organizationId: orgId,
    supabase,
    page: packsPage,
    pageSize: PACKS_PAGE_SIZE,
  })

  const { data: sessions = [], total: sessionsTotal = 0, isLoading: sessionsLoading } = useCoachingSessions({
    organizationId: orgId,
    supabase,
    page: sessionsPage,
    pageSize: SESSIONS_PAGE_SIZE,
  })

  const assignMutation = useAssignCoachMutation(orgId, supabase)
  const completeMutation = useCompleteSessionMutation(orgId, supabase)

  const packsTotalPages = Math.max(1, Math.ceil(packsTotal / PACKS_PAGE_SIZE))
  const sessionsTotalPages = Math.max(1, Math.ceil(sessionsTotal / SESSIONS_PAGE_SIZE))

  useEffect(() => {
    setPacksPage(1)
    setSessionsPage(1)
  }, [orgId])

  useEffect(() => {
    setPacksPage((p) => Math.min(p, packsTotalPages))
  }, [packsTotalPages])

  useEffect(() => {
    setSessionsPage((p) => Math.min(p, sessionsTotalPages))
  }, [sessionsTotalPages])

  const isLoading = orgLoading || packsLoading || sessionsLoading

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Coaching" subtitle="Assign coaches and manage sessions" />

      <Tabs defaultValue="coaching" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="coaching" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Coaching
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coaching" className="space-y-3">
          {isLoading ? (
            <LoadingRows count={3} />
          ) : packs.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No coaching packs"
              description="Coaching packs will appear here once clients enroll."
            />
          ) : (
            <ul className="space-y-3">
              {packs.map((pack) => (
                <PackRow
                  key={pack.enrollment_product_id}
                  pack={pack}
                  organizationId={orgId}
                  onAssign={(memberId) =>
                    assignMutation.mutate({
                      enrollmentProductId: pack.enrollment_product_id,
                      organizationMemberId: memberId,
                    })
                  }
                  onNewSession={
                    pack.coach_full_name != null && pack.user_id != null
                      ? () => setSessionDialogPack(pack)
                      : undefined
                  }
                  assignPending={assignMutation.isPending}
                />
              ))}
            </ul>
          )}
          {packsTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PaginationSummary page={packsPage} pageSize={PACKS_PAGE_SIZE} total={packsTotal} />
              <PaginationControls page={packsPage} pageSize={PACKS_PAGE_SIZE} total={packsTotal} onPageChange={setPacksPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-3">
          {sessionsLoading ? (
            <LoadingRows count={3} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No sessions yet"
              description="Assign a coach to a pack, then create a session."
            />
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onComplete={(completed) =>
                    completeMutation.mutate({ sessionId: session.id, completed })
                  }
                  completePending={completeMutation.isPending}
                />
              ))}
            </ul>
          )}
          {sessionsTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PaginationSummary page={sessionsPage} pageSize={SESSIONS_PAGE_SIZE} total={sessionsTotal} />
              <PaginationControls page={sessionsPage} pageSize={SESSIONS_PAGE_SIZE} total={sessionsTotal} onPageChange={setSessionsPage} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateSessionDialog
        open={sessionDialogPack != null}
        onOpenChange={(open) => !open && setSessionDialogPack(null)}
        organizationId={currentOrganization?.id ?? 0}
        preselectedPack={sessionDialogPack}
        getAssignmentId={useCallback(
          async (enrollmentProductId: number) => {
            if (!supabase) return null
            const a = await getCoachingAssignmentForEnrollmentProduct(supabase, enrollmentProductId)
            return a?.id ?? null
          },
          [supabase]
        )}
        onCreate={async (payload) => {
          if (!supabase) return
          await createCoachingSession(supabase, payload)
          queryClient.invalidateQueries({ queryKey: ["coaching-sessions", orgId] })
          setSessionDialogPack(null)
          toast.success("Session created")
        }}
      />
    </div>
  )
}

function PackRow({
  pack,
  organizationId,
  onAssign,
  onNewSession,
  assignPending,
}: {
  pack: CoachingEnrollmentProduct
  organizationId: number | null
  onAssign: (organizationMemberId: number) => void
  onNewSession?: () => void
  assignPending: boolean
}) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [memberSearchInput, setMemberSearchInput] = useState("")
  const [memberSearch, setMemberSearch] = useState("")

  const handleAssignOpenChange = (open: boolean) => {
    setAssignOpen(open)
    if (!open) {
      setMemberSearchInput("")
      setMemberSearch("")
    }
  }

  const { data: members, isLoading: membersLoading } = useTeamMembersForAssign({
    organizationId,
    search: assignOpen ? memberSearch : "",
  })

  return (
    <RichListItem>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{pack.product_title}</p>
        <p className="text-xs text-muted-foreground">
          {pack.user_full_name} · {pack.offer_title} · Started {formatDate(pack.enrollment_started_at)}
        </p>
        {pack.completion_total != null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pack.completion_completed ?? 0} / {pack.completion_total} sessions ✓
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!pack.coach_full_name && (
          <Popover open={assignOpen} onOpenChange={handleAssignOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={assignPending} className="w-[200px] justify-between">
                Assign coach…
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
              <div className="border-b border-border p-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email…"
                      value={memberSearchInput}
                      onChange={(e) => setMemberSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setMemberSearch(memberSearchInput.trim())
                      }}
                      className="h-9 pl-8"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setMemberSearch(memberSearchInput.trim())}
                    disabled={membersLoading}
                    className="h-9"
                  >
                    Search
                  </Button>
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto p-1">
                {membersLoading ? (
                  <p className="p-3 text-xs text-muted-foreground">Loading…</p>
                ) : members.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No team members found.</p>
                ) : (
                  members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      onClick={() => {
                        onAssign(m.id)
                        setAssignOpen(false)
                        setMemberSearchInput("")
                        setMemberSearch("")
                      }}
                    >
                      {m.display_name ?? m.user_id.slice(0, 8)}{" "}
                      <span className="text-muted-foreground">({m.role})</span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {pack.coach_full_name && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">Coach: {pack.coach_full_name}</span>
            {onNewSession ? (
              <Button size="sm" onClick={onNewSession}>
                <Plus className="mr-1 h-4 w-4" />
                New session
              </Button>
            ) : (
              <div
                className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                title="Client must create an account before you can schedule a session."
              >
                <UserX className="h-3.5 w-3.5 shrink-0" />
                <span>Waiting for client to sign up</span>
              </div>
            )}
          </div>
        )}
      </div>
    </RichListItem>
  )
}

function SessionRow({
  session,
  onComplete,
  completePending,
}: {
  session: CoachingSessionRow
  onComplete: (completed: boolean) => void
  completePending: boolean
}) {
  const isCompleted = session.completed_at != null
  return (
    <RichListItem>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {session.product_title ?? "—"} · {session.user_full_name ?? "—"}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {formatDate(session.scheduled_at)}, {formatDuration(session.duration_minutes)}
            {session.coach_display && ` with ${session.coach_display}`}
          </span>
          {session.delivery_mode && (
            <Badge variant="secondary" className="text-[10px] capitalize">
              {session.delivery_mode}
            </Badge>
          )}
        </p>
        {session.meeting_url && (
          <a
            href={session.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Video className="h-3 w-3" /> Video link
          </a>
        )}
        {session.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {session.location}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isCompleted ? (
          <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onComplete(true)}
            disabled={completePending}
          >
            <Check className="mr-1 h-4 w-4" />
            Mark completed
          </Button>
        )}
      </div>
    </RichListItem>
  )
}
