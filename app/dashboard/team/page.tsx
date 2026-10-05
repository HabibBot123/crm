"use client"

import { useState } from "react"
import {
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Megaphone,
  DollarSign,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  useTeamMembers,
  useInviteTeamMember,
  useCancelTeamInvitation,
  useChangeTeamMemberRole,
  useRevokeTeamAccess,
  useUpdateMemberCommissionDefaults,
} from "@/hooks/use-team"
import type { TeamMember, TeamMemberRole } from "@/lib/services/team"
import { isTeamMemberRole } from "@/lib/permissions/roles"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { useAuth } from "@/hooks/use-auth"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { TeamPlanGate } from "@/components/dashboard/team-plan-gate"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  sales: DollarSign,
  ambassador: Megaphone,
  coach: MessageCircle,
  member: Shield,
}

const roleColors: Record<string, string> = {
  owner: "bg-warning/10 text-warning-foreground",
  admin: "bg-primary/10 text-primary",
  sales: "bg-success/10 text-success",
  ambassador: "bg-chart-2/10 text-chart-2",
  coach: "bg-chart-3/10 text-chart-3",
  member: "bg-muted text-foreground",
}

const DEFAULT_PAGE_SIZE = 10

function parseOptionalPercent(raw: string): number | null | "invalid" {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || n > 100) return "invalid"
  return n
}

function formatRate(value: number | null): string {
  return value == null ? "" : String(value)
}

function formatRoleLabel(role: string): string {
  if (!role) return role
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function memberCommissionSummary(member: TeamMember): string | null {
  const parts: string[] = []
  if (member.default_commission_rate_sales != null) {
    parts.push(`Sales ${member.default_commission_rate_sales}%`)
  }
  if (member.default_commission_rate_ambassador != null) {
    parts.push(`Ambassador ${member.default_commission_rate_ambassador}%`)
  }
  if (member.default_commission_rate_coach != null) {
    parts.push(`Coach ${member.default_commission_rate_coach}%`)
  }
  if (parts.length === 0) return null
  return parts.join(" · ")
}

export default function TeamPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode, can, team } = useOrgCapabilities()
  const { user } = useAuth()
  const orgId = currentOrganization?.id ?? null
  const canInvite = !!user && can("team.invite")
  const canManage = !!user && team.canManageTeam
  const [page, setPage] = useState(1)

  if (orgMode.requiresTeamPlan) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Team" subtitle="Invite and manage people in your organization" />
        <TeamPlanGate
          title="Team management is a Team feature"
          description="This option is for when you work with a team (sales, ambassadors, coaches). Upgrade to invite members and assign roles."
        />
      </div>
    )
  }
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("sales")
  const [inviteRateSales, setInviteRateSales] = useState("")
  const [inviteRateAmbassador, setInviteRateAmbassador] = useState("")
  const [inviteRateCoach, setInviteRateCoach] = useState("")
  const [cancelInvitationMemberId, setCancelInvitationMemberId] = useState<number | null>(null)
  const [revokeAccessMemberId, setRevokeAccessMemberId] = useState<number | null>(null)
  const [changeRoleMemberId, setChangeRoleMemberId] = useState<number | null>(null)
  const [changeRoleMemberLabel, setChangeRoleMemberLabel] = useState<string>("")
  const [changeRoleCurrentRole, setChangeRoleCurrentRole] = useState<TeamMemberRole>("sales")
  const [changeRoleSelectedRole, setChangeRoleSelectedRole] = useState<Exclude<TeamMemberRole, "owner">>("sales")
  const [editRateSales, setEditRateSales] = useState("")
  const [editRateAmbassador, setEditRateAmbassador] = useState("")
  const [editRateCoach, setEditRateCoach] = useState("")
  const [initialRateSales, setInitialRateSales] = useState<number | null>(null)
  const [initialRateAmbassador, setInitialRateAmbassador] = useState<number | null>(null)
  const [initialRateCoach, setInitialRateCoach] = useState<number | null>(null)

  const { data, isLoading } = useTeamMembers({
    organizationId: orgId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const inviteMutation = useInviteTeamMember(orgId)
  const cancelInvitationMutation = useCancelTeamInvitation(orgId)
  const changeRoleMutation = useChangeTeamMemberRole(orgId)
  const revokeAccessMutation = useRevokeTeamAccess(orgId)
  const updateCommissionsMutation = useUpdateMemberCommissionDefaults(orgId)

  const handleInvite = async () => {
    if (!orgId || !email) return
    const rateSales = parseOptionalPercent(inviteRateSales)
    const rateAmbassador = parseOptionalPercent(inviteRateAmbassador)
    const rateCoach = parseOptionalPercent(inviteRateCoach)
    if (rateSales === "invalid" || rateAmbassador === "invalid" || rateCoach === "invalid") return
    await inviteMutation.mutateAsync({
      organizationId: orgId,
      email,
      role: role && isTeamMemberRole(role) && role !== "owner" ? role : "member",
      defaultCommissionRateSales: rateSales,
      defaultCommissionRateAmbassador: rateAmbassador,
      defaultCommissionRateCoach: rateCoach,
    })
    setEmail("")
    setInviteRateSales("")
    setInviteRateAmbassador("")
    setInviteRateCoach("")
  }

  const openMemberEditDialog = (member: TeamMember, primary: string) => {
    setChangeRoleMemberId(member.id)
    setChangeRoleMemberLabel(primary)
    setChangeRoleCurrentRole(member.role)
    if (member.role !== "owner") {
      setChangeRoleSelectedRole(member.role)
    }
    setEditRateSales(formatRate(member.default_commission_rate_sales))
    setEditRateAmbassador(formatRate(member.default_commission_rate_ambassador))
    setEditRateCoach(formatRate(member.default_commission_rate_coach))
    setInitialRateSales(member.default_commission_rate_sales)
    setInitialRateAmbassador(member.default_commission_rate_ambassador)
    setInitialRateCoach(member.default_commission_rate_coach)
  }

  const members: TeamMember[] = data.items
  const total = data.total
  const pageSize = DEFAULT_PAGE_SIZE
  const roleOptions: Array<Exclude<TeamMemberRole, "owner">> = [
    "admin",
    "sales",
    "ambassador",
    "coach",
    "member",
  ]

  const parsedEditSales = parseOptionalPercent(editRateSales)
  const parsedEditAmbassador = parseOptionalPercent(editRateAmbassador)
  const parsedEditCoach = parseOptionalPercent(editRateCoach)
  const commissionsValid =
    parsedEditSales !== "invalid" &&
    parsedEditAmbassador !== "invalid" &&
    parsedEditCoach !== "invalid"
  const roleChanged =
    changeRoleMemberId != null &&
    changeRoleCurrentRole !== "owner" &&
    changeRoleSelectedRole !== changeRoleCurrentRole
  const commissionsActuallyChanged =
    commissionsValid &&
    (parsedEditSales !== initialRateSales ||
      parsedEditAmbassador !== initialRateAmbassador ||
      parsedEditCoach !== initialRateCoach)
  const canSaveMemberEdit =
    canManage &&
    changeRoleMemberId != null &&
    commissionsValid &&
    (roleChanged || commissionsActuallyChanged)
  const isSavingMemberEdit = changeRoleMutation.isPending || updateCommissionsMutation.isPending

  const saveMemberEdit = async () => {
    if (!orgId || changeRoleMemberId == null || !commissionsValid) return

    if (roleChanged) {
      await changeRoleMutation.mutateAsync({
        organizationId: orgId,
        memberId: changeRoleMemberId,
        role: changeRoleSelectedRole,
      })
    }

    if (commissionsActuallyChanged) {
      await updateCommissionsMutation.mutateAsync({
        organizationId: orgId,
        memberId: changeRoleMemberId,
        defaultCommissionRateSales: parsedEditSales,
        defaultCommissionFixedSales: null,
        defaultCommissionRateAmbassador: parsedEditAmbassador,
        defaultCommissionFixedAmbassador: null,
        defaultCommissionRateCoach: parsedEditCoach,
        defaultCommissionFixedCoach: null,
      })
    }

    setChangeRoleMemberId(null)
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Team"
        subtitle={isLoading ? "Loading members…" : `${total} member${total !== 1 ? "s" : ""} and invitations`}
      />

      {canInvite && (
        <SectionCard
          title="Invite team member"
          subtitle="They will receive an email for sign in or sign up. Set default commission % per role type (optional)."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
                <Input
                  id="inviteEmail"
                  placeholder="teammate@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-2" onClick={handleInvite} disabled={inviteMutation.isPending || !email || !orgId}>
                <UserPlus className="h-4 w-4" />
                {inviteMutation.isPending ? "Sending…" : "Invite"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="inviteRateSales" className="text-xs text-muted-foreground">Sales %</Label>
                <Input
                  id="inviteRateSales"
                  placeholder="e.g. 10"
                  inputMode="decimal"
                  value={inviteRateSales}
                  onChange={(e) => setInviteRateSales(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inviteRateAmbassador" className="text-xs text-muted-foreground">Ambassador %</Label>
                <Input
                  id="inviteRateAmbassador"
                  placeholder="e.g. 5"
                  inputMode="decimal"
                  value={inviteRateAmbassador}
                  onChange={(e) => setInviteRateAmbassador(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="inviteRateCoach" className="text-xs text-muted-foreground">Coach %</Label>
                <Input
                  id="inviteRateCoach"
                  placeholder="e.g. 15"
                  inputMode="decimal"
                  value={inviteRateCoach}
                  onChange={(e) => setInviteRateCoach(e.target.value)}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {isLoading && <LoadingRows count={4} />}

      {!isLoading && members.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title="No team members yet"
          description="Invite your first teammate using the form above."
        />
      )}

      {!isLoading && members.length > 0 && (
        <ul className="space-y-3">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role] ?? Shield
            const isCurrentUser = user && member.user_id === user.id
            const memberActions = team.memberActions(member, !!isCurrentUser)
            const canAnyAction =
              memberActions.canCancelInvitation ||
              memberActions.canChangeMemberRole ||
              memberActions.canRevokeAccess
            const currentUserName = (user?.user_metadata?.full_name as string | undefined) ?? null

            const primary = isCurrentUser
              ? currentUserName ?? user?.email ?? "You"
              : member.full_name ?? member.email ?? "Pending invitation"

            const secondary = isCurrentUser
              ? user?.email ?? null
              : member.email ?? null

            const commissionSummary = memberCommissionSummary(member)

            return (
              <RichListItem key={member.id}>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                    {primary.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{primary}</span>
                    {member.role === "owner" && <Crown className="h-3.5 w-3.5 shrink-0 text-warning" />}
                    {isCurrentUser && member.status === "active" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        You
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.status === "invited" &&
                      `Invited on ${member.invited_at ? new Date(member.invited_at).toLocaleDateString("en-US") : ""}`}
                    {member.status === "active" && secondary}
                    {member.status === "revoked" &&
                      `Access revoked${member.revoked_at ? ` on ${new Date(member.revoked_at).toLocaleDateString("en-US")}` : ""}`}
                  </p>
                  {commissionSummary ? (
                    <p className="truncate text-xs text-muted-foreground">{commissionSummary}</p>
                  ) : null}
                </div>
                <Badge className={cn("shrink-0 text-xs capitalize gap-1.5", roleColors[member.role] ?? roleColors.member)}>
                  <RoleIcon className="h-3 w-3" />
                  {member.role}
                </Badge>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {member.status === "invited" && "Invitation pending"}
                  {member.status === "active" &&
                    (member.accepted_at
                      ? `Joined ${new Date(member.accepted_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                      : "")}
                  {member.status === "revoked" &&
                    (member.revoked_at
                      ? `Revoked ${new Date(member.revoked_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                      : "Access revoked")}
                </span>
                {canAnyAction && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {memberActions.canCancelInvitation && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setCancelInvitationMemberId(member.id)}
                          disabled={cancelInvitationMutation.isPending}
                        >
                          Cancel invitation
                        </DropdownMenuItem>
                      )}
                      {memberActions.canChangeMemberRole && (
                        <DropdownMenuItem onSelect={() => openMemberEditDialog(member, primary)}>
                          Change role & commissions
                        </DropdownMenuItem>
                      )}
                      {memberActions.canRevokeAccess && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setRevokeAccessMemberId(member.id)}
                          disabled={revokeAccessMutation.isPending}
                        >
                          Revoke access
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </RichListItem>
            )
          })}
        </ul>
      )}

      {total > 0 && !isLoading && (
        <div className="flex items-center justify-between">
          <PaginationSummary page={page} pageSize={pageSize} total={total} />
          <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      )}

      <AlertDialog
        open={cancelInvitationMemberId !== null}
        onOpenChange={(open) => !open && setCancelInvitationMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation</AlertDialogTitle>
            <AlertDialogDescription>
              This invitation will be deleted. The user will no longer be able to join the organization using this token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelInvitationMemberId == null || orgId == null) return
                cancelInvitationMutation.mutate({
                  organizationId: orgId,
                  memberId: cancelInvitationMemberId,
                })
                setCancelInvitationMemberId(null)
              }}
              disabled={cancelInvitationMutation.isPending}
            >
              {cancelInvitationMutation.isPending ? "Cancelling…" : "Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokeAccessMemberId !== null}
        onOpenChange={(open) => !open && setRevokeAccessMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access</AlertDialogTitle>
            <AlertDialogDescription>
              The member&apos;s access will be revoked and they will no longer be able to use the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revokeAccessMemberId == null || orgId == null) return
                revokeAccessMutation.mutate({ organizationId: orgId, memberId: revokeAccessMemberId })
                setRevokeAccessMemberId(null)
              }}
              disabled={revokeAccessMutation.isPending}
            >
              {revokeAccessMutation.isPending ? "Revoking…" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={changeRoleMemberId !== null}
        onOpenChange={(open) => {
          if (!open) setChangeRoleMemberId(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change role & commissions</DialogTitle>
            <DialogDescription>
              {changeRoleMemberLabel
                ? `Update role and default rates for ${changeRoleMemberLabel}`
                : "Update role and default commission rates"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-member-role">Role</Label>
              <Select
                value={changeRoleSelectedRole}
                onValueChange={(v) => {
                  const nextRole = roleOptions.find((r) => r === v)
                  if (!nextRole) return
                  setChangeRoleSelectedRole(nextRole)
                }}
              >
                <SelectTrigger id="edit-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {formatRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Default commission</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="editRateSales">Sales %</Label>
                  <Input
                    id="editRateSales"
                    inputMode="decimal"
                    value={editRateSales}
                    onChange={(e) => setEditRateSales(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRateAmbassador">Ambassador %</Label>
                  <Input
                    id="editRateAmbassador"
                    inputMode="decimal"
                    value={editRateAmbassador}
                    onChange={(e) => setEditRateAmbassador(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRateCoach">Coach %</Label>
                  <Input
                    id="editRateCoach"
                    inputMode="decimal"
                    value={editRateCoach}
                    onChange={(e) => setEditRateCoach(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangeRoleMemberId(null)}
              disabled={isSavingMemberEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void saveMemberEdit()
              }}
              disabled={!canSaveMemberEdit || isSavingMemberEdit}
            >
              {isSavingMemberEdit ? "Updating…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
