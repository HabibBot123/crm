"use client"

import { useState } from "react"
import { Wallet } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  useCommissions,
  useCommissionsDueTotal,
  useMarkCommissionsPaid,
} from "@/hooks/use-commissions"
import { formatCommissionCents } from "@/components/dashboard/crm/lead-commissions-panel"
import { TeamPlanGate } from "@/components/dashboard/team-plan-gate"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import type { CommissionStatus } from "@/schemas/crm.schema"

const pageSize = 10

function isCommissionStatus(value: string): value is CommissionStatus {
  return value === "pending" || value === "validated" || value === "paid" || value === "canceled"
}

export default function CommissionsPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode, can, isLoading: capsLoading } = useOrgCapabilities()
  const organizationId = currentOrganization?.id ?? null
  const memberId = currentOrganization?.member_id ?? null
  const canPay = can("commissions.mark_paid")
  const canViewAll = can("commissions.view_all")
  const canViewCommissions = can("commissions.view_own") || canViewAll
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const scopedMemberId = canViewAll ? undefined : memberId ?? undefined

  const { commissions, total, isLoading } = useCommissions(organizationId, {
    page,
    pageSize,
    status: statusFilter === "all" ? undefined : statusFilter,
    memberId: scopedMemberId,
  })
  const { dueTotalCents } = useCommissionsDueTotal(organizationId, {
    memberId: scopedMemberId,
  })
  const markPaid = useMarkCommissionsPaid(organizationId)

  if (orgMode.requiresTeamPlan) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader
          title="Commissions"
          subtitle="Track acquisition payouts for your team"
        />
        <TeamPlanGate
          title="Commissions are a Team feature"
          description="This option is for when you have a team (setters, closers, ambassadors) and need to split commissions."
        />
      </div>
    )
  }

  if (!capsLoading && !canViewCommissions) {
    return (
      <NoAccessState
        title="Commissions"
        description="You don’t have permission to view commissions with your role."
      />
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Commissions"
        subtitle="Track amounts owed by lead / pack. Mark paid when you settle with your team."
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "validated", "paid"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
              setSelectedIds([])
            }}
          >
            {value === "all" ? "All open" : value}
          </Button>
        ))}
        {canPay && selectedIds.length > 0 ? (
          <Button
            size="sm"
            className="ml-auto"
            disabled={markPaid.isPending || memberId == null}
            onClick={() => {
              if (memberId == null) return
              markPaid.mutate(
                { commissionIds: selectedIds, paidByMemberId: memberId },
                { onSuccess: () => setSelectedIds([]) }
              )
            }}
          >
            Mark {selectedIds.length} paid
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : commissions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No commissions yet"
          description="Activate commissions on a converted lead from the CRM side panel."
        />
      ) : (
        <SectionCard
          title="Commission lines"
          subtitle={`Due (pending/validated): ${formatCommissionCents(dueTotalCents)}`}
          noPadding
          footer={
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary page={page} pageSize={pageSize} total={total} />
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(nextPage) => {
                  setPage(nextPage)
                  setSelectedIds([])
                }}
              />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/60 border-b border-border">
                <tr>
                  {canPay ? <th className="px-4 py-3 w-10" /> : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Beneficiary
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lead
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((item) => {
                  const checked = selectedIds.includes(item.id)
                  const canSelect = canPay && (item.status === "pending" || item.status === "validated")
                  return (
                    <tr key={item.id} className="hover:bg-accent/60">
                      {canPay ? (
                        <td className="px-4 py-3">
                          {canSelect ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedIds((prev) => [...prev, item.id])
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== item.id))
                                }
                              }}
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {item.member_name ?? (item.member_id ? `#${item.member_id}` : "—")}
                      </td>
                      <td className="px-4 py-3">
                        <div>{item.lead_name ?? `Lead #${item.lead_id}`}</div>
                        <div className="text-xs text-muted-foreground">{item.lead_email}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.attribution_type ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.installment_index}/{item.installment_count}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCommissionCents(item.commission_amount)}
                      </td>
                      <td className="px-4 py-3">
                        {isCommissionStatus(item.status) ? (
                          <StatusBadge status={item.status} />
                        ) : (
                          item.status
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
