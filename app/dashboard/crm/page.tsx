"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CircleAlert, Plus, Search, X } from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"
import { AddLeadDialog } from "@/components/dashboard/crm/add-lead-dialog"
import { LeadSidePanel } from "@/components/dashboard/crm/lead-side-panel"
import {
  CrmFiltersPopover,
  emptyCrmFilters,
  fieldFilterOptions,
  type CrmFilterValues,
} from "@/components/dashboard/crm/crm-filters-popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchSelect } from "@/components/ui/search-select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  useAssignLeadOwner,
  useCreateLead,
  useCrmLeads,
  useCrmSalesMembers,
  useCrmAttributionMembers,
} from "@/hooks/use-crm-leads"
import { useCrmFields } from "@/hooks/use-crm-fields"
import { useBusinessUnits } from "@/hooks/use-business-units"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import type { LeadStatus } from "@/schemas/crm.schema"

const pageSize = 10

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
      }>
    | null
    | undefined,
  type: "closer" | "setter" | "ambassador"
): string {
  const labels =
    attributions
      ?.filter((item) => item.attribution_type === type)
      .map((item) => item.member_name?.trim() || null)
      .filter((item): item is string => Boolean(item)) ?? []
  if (labels.length === 0) return "—"
  if (labels.length === 1) return labels[0]
  return `${labels.length} members`
}

export default function CrmPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode, can } = useOrgCapabilities()
  const canViewLeads = can("crm.leads.view") || can("crm.leads.view_own")
  const canAddLead = can("crm.leads.edit") || can("crm.leads.update_status")
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("search")?.trim() ?? ""
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [refineFilters, setRefineFilters] = useState<CrmFilterValues>(emptyCrmFilters)
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const fromUrl = searchParams.get("search")?.trim() ?? ""
    setSearchInput(fromUrl)
    setSearch(fromUrl)
    setPage(1)
  }, [searchParams])

  const showLeadOwnerAssignment =
    orgMode.showLeadOwnerAssignment && can("crm.assign_sales")
  const showAcquisitionRoles = orgMode.showAcquisitionRoles

  const { fields } = useCrmFields(currentOrganization?.id ?? null)
  const { statuses: leadStatuses } = useOrganizationLeadStatuses(currentOrganization?.id ?? null)
  const { units: businessUnits } = useBusinessUnits(currentOrganization?.id ?? null)
  const { members: salesMembers } = useCrmSalesMembers(currentOrganization?.id ?? null)
  const { members: teamMembers } = useCrmAttributionMembers(currentOrganization?.id ?? null)

  const showBusinessUnitColumn =
    orgMode.showBusinessUnits && businessUnits.length > 0
  const showBusinessUnitFilter = showBusinessUnitColumn

  const filterableFields = useMemo(
    () =>
      fields
        .filter((field) => field.filterable)
        .sort((a, b) => a.position - b.position),
    [fields]
  )

  const filters = useMemo(() => {
    const fieldFilters = Object.entries(refineFilters.fieldFilters)
      .map(([fieldDefId, values]) => ({
        fieldDefId: Number(fieldDefId),
        values,
      }))
      .filter(
        (item) =>
          Number.isFinite(item.fieldDefId) &&
          item.values.length > 0 &&
          filterableFields.some((field) => field.id === item.fieldDefId)
      )

    return {
      search,
      status:
        refineFilters.statuses.length > 0 ? refineFilters.statuses : undefined,
      origin: refineFilters.origins.length > 0 ? refineFilters.origins : undefined,
      memberIds:
        refineFilters.memberIds.length > 0 ? refineFilters.memberIds : undefined,
      businessUnitIds:
        showBusinessUnitFilter && refineFilters.businessUnitIds.length > 0
          ? refineFilters.businessUnitIds
          : undefined,
      fieldFilters: fieldFilters.length > 0 ? fieldFilters : undefined,
    }
  }, [search, refineFilters, showBusinessUnitFilter, filterableFields])

  const { data, isLoading, error } = useCrmLeads({
    organizationId: currentOrganization?.id ?? null,
    page,
    pageSize,
    filters,
  })
  const createLead = useCreateLead(currentOrganization?.id ?? null)
  const assignOwner = useAssignLeadOwner(currentOrganization?.id ?? null)

  const visibleFields = useMemo(
    () => fields.filter((f) => f.show_in_crm).sort((a, b) => a.position - b.position),
    [fields]
  )

  const items = data.items
  const total = data.total

  const hasFieldFilters = Object.values(refineFilters.fieldFilters).some(
    (values) => values.length > 0
  )

  const hasActiveFilters =
    refineFilters.statuses.length > 0 ||
    refineFilters.origins.length > 0 ||
    refineFilters.memberIds.length > 0 ||
    (showBusinessUnitFilter && refineFilters.businessUnitIds.length > 0) ||
    hasFieldFilters

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyRefineFilters(next: CrmFilterValues) {
    setRefineFilters(next)
    setPage(1)
  }

  function removeStatus(value: LeadStatus) {
    setRefineFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeOrigin(value: "form" | "manual") {
    setRefineFilters((prev) => ({
      ...prev,
      origins: prev.origins.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeMember(value: number) {
    setRefineFilters((prev) => ({
      ...prev,
      memberIds: prev.memberIds.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeBusinessUnit(value: number) {
    setRefineFilters((prev) => ({
      ...prev,
      businessUnitIds: prev.businessUnitIds.filter((item) => item !== value),
    }))
    setPage(1)
  }

  function removeFieldFilterValue(fieldDefId: number, value: string) {
    setRefineFilters((prev) => {
      const key = String(fieldDefId)
      const current = prev.fieldFilters[key] ?? []
      const nextValues = current.filter((item) => item !== value)
      const nextFieldFilters = { ...prev.fieldFilters }
      if (nextValues.length === 0) {
        delete nextFieldFilters[key]
      } else {
        nextFieldFilters[key] = nextValues
      }
      return { ...prev, fieldFilters: nextFieldFilters }
    })
    setPage(1)
  }

  function statusChipLabel(value: LeadStatus): string {
    return leadStatuses.find((status) => status.key === value)?.label ?? value
  }

  function originChipLabel(value: "form" | "manual"): string {
    return value === "form" ? "Form" : "Manual"
  }

  if (!currentOrganization) {
    return (
      <div className="min-w-0 space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization to use CRM.</p>
      </div>
    )
  }

  if (!canViewLeads) {
    return (
      <div className="min-w-0 space-y-4 p-6 lg:p-8">
        <PageHeader title="CRM" subtitle="Manage inbound leads and pipeline" />
        <EmptyState
          title="No access"
          description="You don’t have permission to view leads for this organization."
        />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 p-6 lg:p-8">
      <PageHeader title="CRM" subtitle="Manage inbound leads and pipeline">
        <Button variant="outline" asChild>
          <Link href="/dashboard/crm/forms/fields">Fields</Link>
        </Button>
        {orgMode.showBusinessUnits ? (
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings?section=business-units">Business units</Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href="/dashboard/crm/forms">Forms</Link>
        </Button>
        {canAddLead ? (
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        ) : null}
      </PageHeader>

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
            placeholder="Search by name or email"
          />
          <CrmFiltersPopover
            values={refineFilters}
            leadStatuses={leadStatuses}
            members={teamMembers}
            businessUnits={businessUnits}
            filterableFields={filterableFields}
            showBusinessUnitFilter={showBusinessUnitFilter}
            onApply={applyRefineFilters}
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {refineFilters.statuses.map((value) => (
              <Button
                key={`status-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeStatus(value)}
              >
                {statusChipLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {refineFilters.origins.map((value) => (
              <Button
                key={`origin-${value}`}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeOrigin(value)}
              >
                {originChipLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {refineFilters.memberIds.map((memberId) => {
              const member = teamMembers.find((item) => item.memberId === memberId)
              const label = member?.fullName?.trim() || `Member #${memberId}`
              return (
                <Button
                  key={`member-${memberId}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => removeMember(memberId)}
                >
                  {label}
                  <X className="h-3 w-3" />
                </Button>
              )
            })}
            {showBusinessUnitFilter
              ? refineFilters.businessUnitIds.map((unitId) => {
                  const unit = businessUnits.find((item) => item.id === unitId)
                  const label = unit?.name ?? `BU #${unitId}`
                  return (
                    <Button
                      key={`bu-${unitId}`}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => removeBusinessUnit(unitId)}
                    >
                      {label}
                      <X className="h-3 w-3" />
                    </Button>
                  )
                })
              : null}
            {filterableFields.flatMap((field) => {
              const selected = refineFilters.fieldFilters[String(field.id)] ?? []
              const options = fieldFilterOptions(field)
              return selected.map((value) => {
                const optionLabel =
                  options.find((option) => option.value === value)?.label ?? value
                return (
                  <Button
                    key={`field-${field.id}-${value}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => removeFieldFilterValue(field.id, value)}
                  >
                    {field.label}: {optionLabel}
                    <X className="h-3 w-3" />
                  </Button>
                )
              })
            })}
          </div>
        ) : null}
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
        <EmptyState
          title={hasActiveFilters || search ? "No matching leads" : "No leads yet"}
          description={
            hasActiveFilters || search
              ? "Try another search or clear the filters."
              : "Add your first lead to start using CRM."
          }
        />
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
          <TableScroll>
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  {showBusinessUnitColumn ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Business unit
                    </th>
                  ) : null}
                  {showLeadOwnerAssignment ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</th>
                  ) : null}
                  {showAcquisitionRoles ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setter</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ambassadors</th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offer</th>
                  {visibleFields.map((field) => (
                    <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </th>
                  ))}
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
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{lead.full_name}</span>
                          {lead.is_duplicate ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex shrink-0 text-destructive"
                                  aria-label="Already known"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <CircleAlert className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Same email already in CRM
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                      <td className="px-4 py-3 min-w-[140px] whitespace-nowrap text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {originChipLabel(lead.origin)}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} catalog={leadStatuses} />
                      </td>
                      {showBusinessUnitColumn ? (
                        <td className="px-4 py-3 text-muted-foreground">
                          {lead.business_unit_name ?? "—"}
                        </td>
                      ) : null}
                      {showLeadOwnerAssignment ? (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <SearchSelect
                            className="w-[160px]"
                            value={lead.owner_id ? String(lead.owner_id) : "none"}
                            onValueChange={async (value) => {
                              try {
                                await assignOwner.mutateAsync({
                                  leadId: lead.id,
                                  ownerId: value === "none" ? null : Number(value),
                                })
                              } catch (err) {
                                toast.error("Could not assign owner", {
                                  description:
                                    err instanceof Error ? err.message : "Unexpected error",
                                })
                              }
                            }}
                            disabled={
                              lead.commissions_activated_at != null ||
                              assignOwner.isPending
                            }
                            placeholder="Assign owner"
                            searchPlaceholder="Search team…"
                            emptyText="No team member found."
                            noneOption={{ value: "none", label: "Unassigned" }}
                            options={salesMembers.map((member) => ({
                              value: String(member.memberId),
                              label: member.fullName ?? `Member #${member.memberId}`,
                            }))}
                          />
                        </td>
                      ) : null}
                      {showAcquisitionRoles ? (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {attributionLabels(lead.attributions, "closer")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {attributionLabels(lead.attributions, "setter")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {attributionLabels(lead.attributions, "ambassador")}
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-muted-foreground">{lead.offer_title ?? "—"}</td>
                      {visibleFields.map((field) => (
                        <td key={field.id} className="px-4 py-3 text-muted-foreground">
                          {lead.crm_fields_visible?.[field.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        </SectionCard>
      )}

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        salesMembers={salesMembers}
        showOwnerAssignment={showLeadOwnerAssignment}
        isPending={createLead.isPending || assignOwner.isPending}
        onSubmit={async (input) => {
          try {
            const lead = await createLead.mutateAsync({
              full_name: input.fullName,
              email: input.email,
              phone: input.phone || null,
              origin: "manual",
              created_by_member_id: currentOrganization.member_id,
              owner_id: null,
            })
            if (input.ownerId != null) {
              await assignOwner.mutateAsync({
                leadId: lead.id,
                ownerId: input.ownerId,
              })
            }
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
        attributionMembers={teamMembers}
        open={!!selectedLeadId}
        onOpenChange={(value) => {
          if (!value) setSelectedLeadId(null)
        }}
      />
    </div>
  )
}
