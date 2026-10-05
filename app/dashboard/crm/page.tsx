"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"
import { AddLeadDialog } from "@/components/dashboard/crm/add-lead-dialog"
import { LeadSidePanel } from "@/components/dashboard/crm/lead-side-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchSelect } from "@/components/ui/search-select"
import { toast } from "sonner"
import {
  useCreateLead,
  useCrmLeads,
  useCrmSalesMembers,
  useCrmAttributionMembers,
  useUpdateLeadAssignment,
} from "@/hooks/use-crm-leads"
import { useCrmFields } from "@/hooks/use-crm-fields"
import { useBusinessUnits } from "@/hooks/use-business-units"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import type { LeadStatus } from "@/schemas/crm.schema"

const pageSize = 10
const statusOptions: LeadStatus[] = [
  "new",
  "booked",
  "deadline",
  "converted",
  "failed",
  "contact_later",
]

function isLeadStatus(value: string): value is LeadStatus {
  return (
    value === "new" ||
    value === "booked" ||
    value === "deadline" ||
    value === "converted" ||
    value === "failed" ||
    value === "contact_later"
  )
}

function isLeadOrigin(value: string): value is "form" | "manual" {
  return value === "form" || value === "manual"
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function attributionLabels(
  attributions:
    | Array<{
        attribution_type: string
        member_name: string | null
        commission_rate: number | null
      }>
    | null
    | undefined,
  type: "closer" | "setter" | "ambassador"
): string {
  const labels =
    attributions
      ?.filter((item) => item.attribution_type === type)
      .map((item) => {
        const name = item.member_name?.trim()
        if (!name) return null
        if (item.commission_rate != null) return `${name} (${item.commission_rate}%)`
        return name
      })
      .filter((item): item is string => Boolean(item)) ?? []
  return labels.length > 0 ? labels.join(", ") : "—"
}

export default function CrmPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode, can } = useOrgCapabilities()
  const canViewLeads = can("crm.leads.view") || can("crm.leads.view_own")
  const canAddLead = can("crm.leads.edit") || can("crm.leads.update_status")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("all")
  const [origin, setOrigin] = useState<string>("all")
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const filters = useMemo(
    () => ({
      search,
      status:
        status === "all" ? undefined : isLeadStatus(status) ? [status] : undefined,
      origin:
        origin === "all"
          ? undefined
          : isLeadOrigin(origin)
          ? [origin]
          : undefined,
    }),
    [search, status, origin]
  )

  const { data, isLoading, error } = useCrmLeads({
    organizationId: currentOrganization?.id ?? null,
    page,
    pageSize,
    filters,
  })
  const { fields } = useCrmFields(currentOrganization?.id ?? null)
  const { units: businessUnits } = useBusinessUnits(currentOrganization?.id ?? null)
  const { members: salesMembers } = useCrmSalesMembers(currentOrganization?.id ?? null)
  const { members: attributionMembers } = useCrmAttributionMembers(currentOrganization?.id ?? null)
  const createLead = useCreateLead(currentOrganization?.id ?? null)
  const assignLead = useUpdateLeadAssignment(currentOrganization?.id ?? null)

  const visibleFields = useMemo(
    () => fields.filter((f) => f.show_in_crm).sort((a, b) => a.position - b.position),
    [fields]
  )
  const showBusinessUnitColumn =
    orgMode.showBusinessUnits && businessUnits.length > 0
  const showAcquisitionRoles = orgMode.showAcquisitionRoles
  const showLeadSalesAssignment =
    orgMode.showLeadSalesAssignment && can("crm.assign_sales")

  const items = data.items
  const total = data.total

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization to use CRM.</p>
      </div>
    )
  }

  if (!canViewLeads) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="CRM" subtitle="Manage inbound leads and pipeline" />
        <EmptyState
          title="No access"
          description="You don’t have permission to view leads for this organization."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="CRM" subtitle="Manage inbound leads and pipeline">
        <Button variant="outline" asChild>
          <Link href="/dashboard/crm/forms/fields">Fields</Link>
        </Button>
        {orgMode.showBusinessUnits ? (
          <Button variant="outline" asChild>
            <Link href="/dashboard/crm/forms/business-units">Business units</Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href="/dashboard/crm/forms">Forms hub</Link>
        </Button>
        {canAddLead ? (
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1)
                setSearch(searchInput.trim())
              }
            }}
            placeholder="Search by name or email"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1)
            setSearch(searchInput.trim())
          }}
        >
          Search
        </Button>
        <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">new</SelectItem>
            <SelectItem value="booked">booked</SelectItem>
            <SelectItem value="deadline">deadline</SelectItem>
            <SelectItem value="converted">converted</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="contact_later">contact_later</SelectItem>
          </SelectContent>
        </Select>
        <Select value={origin} onValueChange={(value) => { setOrigin(value); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All origins</SelectItem>
            <SelectItem value="form">form</SelectItem>
            <SelectItem value="manual">manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SectionCard>
          <LoadingRows count={6} />
        </SectionCard>
      ) : error ? (
        <SectionCard>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load leads"}
          </p>
        </SectionCard>
      ) : items.length === 0 ? (
        <EmptyState title="No leads yet" description="Add your first lead to start using CRM." />
      ) : (
        <SectionCard
          noPadding
          footer={
            <div className="flex items-center justify-between gap-2">
              <PaginationSummary page={page} pageSize={pageSize} total={total} />
              <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  {showLeadSalesAssignment ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales</th>
                  ) : null}
                  {showAcquisitionRoles ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setter</th>
                    </>
                  ) : null}
                  {showBusinessUnitColumn ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Business unit
                    </th>
                  ) : null}
                  {showAcquisitionRoles ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambassadors</th>
                  ) : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  {visibleFields.map((field) => (
                    <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className={
                        lead.is_duplicate
                          ? "cursor-pointer bg-destructive/10 transition-colors hover:bg-destructive/15"
                          : "cursor-pointer transition-colors hover:bg-accent/60"
                      }
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{lead.full_name}</span>
                          {lead.is_duplicate ? (
                            <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                              Already known
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.origin}</td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      {showLeadSalesAssignment ? (
                        <td className="px-4 py-3 text-muted-foreground">{lead.sales_name ?? "—"}</td>
                      ) : null}
                      {showAcquisitionRoles ? (
                        <>
                          <td className="px-4 py-3 text-muted-foreground">
                            {attributionLabels(lead.attributions, "closer")}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {attributionLabels(lead.attributions, "setter")}
                          </td>
                        </>
                      ) : null}
                      {showBusinessUnitColumn ? (
                        <td className="px-4 py-3 text-muted-foreground">
                          {lead.business_unit_name ?? "—"}
                        </td>
                      ) : null}
                      {showAcquisitionRoles ? (
                        <td className="px-4 py-3 text-muted-foreground">
                          {attributionLabels(lead.attributions, "ambassador")}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-muted-foreground">{lead.offer_title ?? "—"}</td>
                      <td className="px-4 py-3 min-w-[140px] whitespace-nowrap text-muted-foreground">
                        {formatDate(lead.status_at)}
                      </td>
                      {visibleFields.map((field) => (
                        <td key={field.id} className="px-4 py-3 text-muted-foreground">
                          {lead.crm_fields_visible?.[field.key] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {showLeadSalesAssignment ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <SearchSelect
                              className="w-[160px]"
                              value={lead.assigned_sales_id ? String(lead.assigned_sales_id) : "none"}
                              onValueChange={async (value) => {
                                try {
                                  await assignLead.mutateAsync({
                                    leadId: lead.id,
                                    assignedSalesId: value === "none" ? null : Number(value),
                                  })
                                } catch (err) {
                                  toast.error("Could not assign lead", {
                                    description: err instanceof Error ? err.message : "Unexpected error",
                                  })
                                }
                              }}
                              placeholder="Assign"
                              searchPlaceholder="Search sales…"
                              emptyText="No sales member found."
                              noneOption={{ value: "none", label: "Unassigned" }}
                              options={salesMembers.map((member) => ({
                                value: String(member.memberId),
                                label: member.fullName ?? `Member #${member.memberId}`,
                              }))}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLeadId(lead.id)
                            }}
                          >
                            Open
                          </Button>
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

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        salesMembers={salesMembers}
        showSalesAssignment={showLeadSalesAssignment}
        isPending={createLead.isPending}
        onSubmit={async (input) => {
          try {
            await createLead.mutateAsync({
              full_name: input.fullName,
              email: input.email,
              phone: input.phone || null,
              origin: "manual",
              created_by_member_id: currentOrganization.member_id,
              assigned_sales_id: input.assignedSalesId,
            })
          } catch (err) {
            toast.error("Could not create lead", {
              description: err instanceof Error ? err.message : "Unexpected error",
            })
          }
        }}
      />

      <LeadSidePanel
        leadId={selectedLeadId}
        organizationId={currentOrganization.id}
        changedByMemberId={currentOrganization.member_id}
        salesMembers={salesMembers}
        attributionMembers={attributionMembers}
        open={!!selectedLeadId}
        onOpenChange={(value) => {
          if (!value) setSelectedLeadId(null)
        }}
      />
    </div>
  )
}
