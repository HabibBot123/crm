"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  MessageCircle,
  Calendar,
  Check,
  Plus,
  Video,
  MapPin,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCoachingEnrollmentProductsForOrg,
  fetchCoachingSessionsForOrg,
  fetchOrganizationMembers,
  getCoachingAssignmentForEnrollmentProduct,
  upsertCoachingAssignment,
  createCoachingSession,
  updateCoachingSessionCompleted,
  type CoachingEnrollmentProduct,
  type CoachingSessionRow,
  type OrganizationMemberForSelect,
} from "@/lib/services/coaching"
import { CreateSessionDialog } from "@/components/dashboard/coaching/create-session-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

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
  const orgId = currentOrganization?.id ?? null

  const { data: packs = [], isLoading: packsLoading } = useQuery({
    queryKey: ["coaching-packs", orgId],
    queryFn: () => fetchCoachingEnrollmentProductsForOrg(supabase, orgId!),
    enabled: !!orgId,
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: () => fetchOrganizationMembers(supabase, orgId!),
    enabled: !!orgId,
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["coaching-sessions", orgId],
    queryFn: () => fetchCoachingSessionsForOrg(supabase, orgId!),
    enabled: !!orgId,
  })

  const assignMutation = useMutation({
    mutationFn: ({
      enrollmentProductId,
      organizationMemberId,
    }: {
      enrollmentProductId: number
      organizationMemberId: number
    }) =>
      upsertCoachingAssignment(supabase, enrollmentProductId, organizationMemberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-packs", orgId] })
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions", orgId] })
      toast.success("Coach assigned")
    },
    onError: (e) => toast.error(e.message),
  })

  const completeMutation = useMutation({
    mutationFn: ({ sessionId, completed }: { sessionId: number; completed: boolean }) =>
      updateCoachingSessionCompleted(
        supabase,
        sessionId,
        completed ? new Date().toISOString() : null
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaching-sessions", orgId] })
      queryClient.invalidateQueries({ queryKey: ["coaching-packs", orgId] })
      toast.success("Session updated")
    },
    onError: (e) => toast.error(e.message),
  })

  const isLoading = orgLoading || packsLoading || membersLoading || sessionsLoading

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display">Coaching</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign coaches and manage sessions
        </p>
      </div>

      {/* Coaching packs */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5" />
            Coaching packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : packs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coaching packs for this organization.</p>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <PackRow
                  key={pack.enrollment_product_id}
                  pack={pack}
                  members={members}
                  onAssign={(memberId) =>
                    assignMutation.mutate({
                      enrollmentProductId: pack.enrollment_product_id,
                      organizationMemberId: memberId,
                    })
                  }
                  onNewSession={pack.coach_full_name != null ? () => setSessionDialogPack(pack) : undefined}
                  assignPending={assignMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Sessions
          </CardTitle>
        </CardHeader>
        <CreateSessionDialog
          open={sessionDialogPack != null}
          onOpenChange={(open) => !open && setSessionDialogPack(null)}
          organizationId={currentOrganization?.id ?? 0}
          preselectedPack={sessionDialogPack}
          getAssignmentId={useCallback(
            async (enrollmentProductId: number) => {
              const a = await getCoachingAssignmentForEnrollmentProduct(supabase, enrollmentProductId)
              return a?.id ?? null
            },
            [supabase]
          )}
          onCreate={async (payload) => {
            await createCoachingSession(supabase, payload)
            queryClient.invalidateQueries({ queryKey: ["coaching-sessions", orgId] })
            setSessionDialogPack(null)
            toast.success("Session created")
          }}
        />
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions. Assign a coach to a pack, then create a session.</p>
          ) : (
            <div className="space-y-2">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PackRow({
  pack,
  members,
  onAssign,
  onNewSession,
  assignPending,
}: {
  pack: CoachingEnrollmentProduct
  members: OrganizationMemberForSelect[]
  onAssign: (organizationMemberId: number) => void
  onNewSession?: () => void
  assignPending: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{pack.product_title}</p>
        <p className="text-xs text-muted-foreground">
          {pack.user_full_name} · {pack.offer_title} · Started {formatDate(pack.enrollment_started_at)}
        </p>
        {pack.completion_total != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {pack.completion_completed ?? 0} / {pack.completion_total} sessions ✓
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!pack.coach_full_name && (
          <Select
            value="none"
            onValueChange={(v) => {
              if (v === "none") return
              onAssign(Number(v))
            }}
            disabled={assignPending}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not assigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.display_name ?? m.user_id.slice(0, 8)} ({m.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {pack.coach_full_name && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">
              Coach: {pack.coach_full_name}
            </span>
            {onNewSession && (
              <Button size="sm" variant="default" onClick={onNewSession}>
                <Plus className="h-4 w-4 mr-1" />
                New session
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">
          {session.product_title ?? "—"} · {session.user_full_name ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>{formatDate(session.scheduled_at)}, {formatDuration(session.duration_minutes)}{session.coach_display && ` with ${session.coach_display}`}</span>
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
            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
          >
            <Video className="h-3 w-3" /> Video link
          </a>
        )}
        {session.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
            <Check className="h-4 w-4 mr-1" />
            Mark completed
          </Button>
        )}
      </div>
    </div>
  )
}

