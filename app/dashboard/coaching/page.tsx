"use client"

import { useState, useCallback, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  MessageCircle,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useAuth } from "@/hooks/use-auth"
import {
  useCoachingPacks,
  usePackSessions,
  useAssignCoachMutation,
  useRemoveCoachMutation,
  useCompleteSessionMutation,
} from "@/hooks/use-coaching"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getCoachingAssignmentForEnrollmentProduct,
  createCoachingSession,
  type CoachingEnrollmentProduct,
  type CoachingPackAssignmentFilter,
  type CoachingPackEnrollmentStatus,
} from "@/lib/services/coaching"
import { CreateSessionDialog } from "@/components/dashboard/coaching/create-session-dialog"
import { PackSessionsSheet } from "@/components/dashboard/coaching/pack-sessions-sheet"
import { AssignCoachDialog } from "@/components/dashboard/coaching/assign-coach-dialog"
import {
  CoachingFiltersPopover,
  assignmentFilterLabel,
  emptyCoachingFilters,
  enrollmentStatusLabel,
  type CoachingFilterValues,
} from "@/components/dashboard/coaching/coaching-filters-popover"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { toast } from "sonner"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"

const PAGE_SIZE = 10

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isLivingEnrollment(status: string): boolean {
  return status === "active" || status === "paused"
}

export default function CoachingPage() {
  const { supabase } = useAuth()
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const { mode: orgMode, can } = useOrgCapabilities()
  const canViewCoaching = can("coaching.view")
  const canAssignCoach = orgMode.isTeam && can("coaching.assign")
  const canCreateSession = can("coaching.sessions.create")
  const canCompleteSession = can("coaching.sessions.complete")
  const queryClient = useQueryClient()

  const [sessionDialogPack, setSessionDialogPack] =
    useState<CoachingEnrollmentProduct | null>(null)
  const [assignDialogPack, setAssignDialogPack] =
    useState<CoachingEnrollmentProduct | null>(null)
  const [assignDialogMode, setAssignDialogMode] = useState<"assign" | "change">(
    "assign"
  )
  const [removeDialogPack, setRemoveDialogPack] =
    useState<CoachingEnrollmentProduct | null>(null)
  const [sessionsPack, setSessionsPack] =
    useState<CoachingEnrollmentProduct | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<CoachingFilterValues>(emptyCoachingFilters)

  const orgId = currentOrganization?.id ?? null

  const {
    data: packs = [],
    total: packsTotal = 0,
    isLoading: packsLoading,
  } = useCoachingPacks({
    organizationId: orgId,
    supabase,
    page,
    pageSize: PAGE_SIZE,
    search,
    assignmentFilters: filters.assignmentFilters,
    enrollmentStatuses: filters.enrollmentStatuses,
  })

  const { data: packSessions = [], isLoading: packSessionsLoading } =
    usePackSessions({
      organizationId: orgId,
      supabase,
      enrollmentProductId: sessionsPack?.enrollment_product_id ?? null,
      enabled: sessionsPack != null,
    })

  const assignMutation = useAssignCoachMutation(orgId, supabase)
  const removeMutation = useRemoveCoachMutation(orgId, supabase)
  const completeMutation = useCompleteSessionMutation(orgId, supabase)

  const totalPages = Math.max(1, Math.ceil(packsTotal / PAGE_SIZE))
  const hasActiveFilters =
    filters.assignmentFilters.length > 0 || filters.enrollmentStatuses.length > 0
  const hasFilters = search.length > 0 || hasActiveFilters
  const isLoading = orgLoading || packsLoading

  useEffect(() => {
    setPage(1)
  }, [orgId])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: CoachingFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removeAssignmentFilter(value: CoachingPackAssignmentFilter) {
    applyFilters({
      ...filters,
      assignmentFilters: filters.assignmentFilters.filter((v) => v !== value),
    })
  }

  function removeEnrollmentStatus(value: CoachingPackEnrollmentStatus) {
    applyFilters({
      ...filters,
      enrollmentStatuses: filters.enrollmentStatuses.filter((v) => v !== value),
    })
  }

  const getAssignmentId = useCallback(
    async (enrollmentProductId: number) => {
      if (!supabase) return null
      const a = await getCoachingAssignmentForEnrollmentProduct(
        supabase,
        enrollmentProductId
      )
      return a?.id ?? null
    },
    [supabase]
  )

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization.</p>
      </div>
    )
  }

  if (!orgLoading && !canViewCoaching) {
    return (
      <NoAccessState
        title="Coaching"
        description="You don’t have permission to view coaching packs for this organization."
      />
    )
  }

  return (
    <div className="min-w-0 space-y-4 p-6 lg:p-8">
      <PageHeader title="Coaching" subtitle="Assign coaches and track sessions." />

      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-9 pr-11"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch()
            }}
            placeholder="Search client, product, offer, or coach"
          />
          <CoachingFiltersPopover values={filters} onApply={applyFilters} />
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.assignmentFilters.map((value) => (
              <Button
                key={`assignment-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeAssignmentFilter(value)}
              >
                {assignmentFilterLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {filters.enrollmentStatuses.map((value) => (
              <Button
                key={`status-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeEnrollmentStatus(value)}
              >
                {enrollmentStatusLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : packs.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={hasFilters ? "No matching packs" : "No coaching packs"}
          description={
            hasFilters
              ? "Try another search or clear filters."
              : "Packs appear when clients buy coaching."
          }
        />
      ) : (
        <SectionCard
          noPadding
          footer={
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary
                page={page}
                pageSize={PAGE_SIZE}
                total={packsTotal}
              />
              <PaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                total={packsTotal}
                onPageChange={setPage}
              />
            </div>
          }
        >
          <TableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Progress
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Coach
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {packs.map((pack) => {
                  const living = isLivingEnrollment(pack.enrollment_status)
                  const waitingSignup =
                    living &&
                    pack.coach_full_name != null &&
                    pack.user_id == null
                  const canLogSession =
                    living &&
                    canCreateSession &&
                    pack.coach_full_name != null &&
                    pack.user_id != null
                  const canAssign =
                    living && canAssignCoach && pack.coach_full_name == null
                  const actionPending =
                    assignMutation.isPending || removeMutation.isPending

                  return (
                    <tr
                      key={pack.enrollment_product_id}
                      className="cursor-pointer hover:bg-accent/60"
                      onClick={() => setSessionsPack(pack)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {pack.user_full_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Started {formatDate(pack.enrollment_started_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{pack.product_title}</div>
                        <div className="text-xs text-muted-foreground">
                          {pack.offer_title}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {pack.completion_total != null
                          ? `${pack.completion_completed ?? 0} / ${pack.completion_total}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {pack.coach_full_name ?? (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pack.enrollment_status} />
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {canAssign ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionPending}
                              onClick={() => {
                                setAssignDialogMode("assign")
                                setAssignDialogPack(pack)
                              }}
                            >
                              Assign coach
                            </Button>
                          ) : null}
                          {canLogSession ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionPending}
                              onClick={() => setSessionDialogPack(pack)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Log session
                            </Button>
                          ) : null}
                          {waitingSignup ? (
                            <span className="text-xs text-muted-foreground">
                              Waiting for signup
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </SectionCard>
      )}

      <PackSessionsSheet
        pack={sessionsPack}
        open={sessionsPack != null}
        onOpenChange={(open) => {
          if (!open) setSessionsPack(null)
        }}
        sessions={packSessions}
        sessionsLoading={packSessionsLoading}
        canComplete={canCompleteSession}
        canCreateSession={canCreateSession}
        canEditCoach={
          sessionsPack != null &&
          canAssignCoach &&
          isLivingEnrollment(sessionsPack.enrollment_status) &&
          sessionsPack.coach_full_name != null &&
          sessionsPack.coach_editable
        }
        actionPending={assignMutation.isPending || removeMutation.isPending}
        completePending={completeMutation.isPending}
        onComplete={(sessionId, completed) =>
          completeMutation.mutate({ sessionId, completed })
        }
        onLogSession={() => {
          if (sessionsPack == null) return
          setSessionDialogPack(sessionsPack)
        }}
        onChangeCoach={() => {
          if (sessionsPack == null) return
          setAssignDialogMode("change")
          setAssignDialogPack(sessionsPack)
        }}
        onRemoveCoach={() => {
          if (sessionsPack == null) return
          setRemoveDialogPack(sessionsPack)
        }}
      />

      <AssignCoachDialog
        open={assignDialogPack != null}
        onOpenChange={(open) => !open && setAssignDialogPack(null)}
        organizationId={orgId}
        pack={assignDialogPack}
        mode={assignDialogMode}
        isPending={assignMutation.isPending}
        onConfirm={({ organizationMemberId, rate, fixed }) => {
          if (assignDialogPack == null) return
          assignMutation.mutate(
            {
              enrollmentProductId: assignDialogPack.enrollment_product_id,
              organizationMemberId,
              rate,
              fixed,
              isChange: assignDialogMode === "change",
            },
            {
              onSuccess: () => setAssignDialogPack(null),
            }
          )
        }}
      />

      <AlertDialog
        open={removeDialogPack != null}
        onOpenChange={(open) => !open && setRemoveDialogPack(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove coach?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeDialogPack
                ? `Remove ${removeDialogPack.coach_full_name ?? "the coach"} from ${removeDialogPack.product_title}. Pending delivery commissions for this pack will be deleted.`
                : "Pending delivery commissions for this pack will be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMutation.isPending || removeDialogPack == null}
              onClick={(event) => {
                event.preventDefault()
                if (removeDialogPack == null) return
                removeMutation.mutate(
                  {
                    enrollmentProductId: removeDialogPack.enrollment_product_id,
                  },
                  {
                    onSuccess: () => {
                      setRemoveDialogPack(null)
                      setSessionsPack((prev) =>
                        prev == null
                          ? null
                          : {
                              ...prev,
                              coach_full_name: null,
                              coach_editable: true,
                            }
                      )
                    },
                  }
                )
              }}
            >
              {removeMutation.isPending ? "Removing…" : "Remove coach"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateSessionDialog
        open={sessionDialogPack != null}
        onOpenChange={(open) => !open && setSessionDialogPack(null)}
        organizationId={currentOrganization?.id ?? 0}
        preselectedPack={sessionDialogPack}
        getAssignmentId={getAssignmentId}
        onCreate={async (payload) => {
          if (!supabase) return
          await createCoachingSession(supabase, payload)
          queryClient.invalidateQueries({
            queryKey: ["coaching-sessions", orgId],
          })
          queryClient.invalidateQueries({
            queryKey: ["coaching-packs", orgId],
          })
          setSessionDialogPack(null)
          toast.success("Session created")
        }}
      />
    </div>
  )
}
