"use client"

import { useMemo, useState } from "react"
import { ChevronDown, CircleAlert, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SearchSelect } from "@/components/ui/search-select"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"
import { LeadTimeline } from "@/components/dashboard/crm/lead-timeline"
import { UpdateStatusDialog } from "@/components/dashboard/crm/update-status-dialog"
import type { AttributionMemberOption, SalesMemberOption } from "@/lib/services/crm"
import { memberDefaultsForAttributionType } from "@/lib/services/crm"
import {
  useCreateLeadAttribution,
  useCrmLeadDetail,
  useDeleteLeadAttribution,
  useUpdateLeadAttribution,
  useUpdateLeadFields,
} from "@/hooks/use-crm-lead-detail"
import { useCrmFields } from "@/hooks/use-crm-fields"
import {
  useAssignLeadBusinessUnit,
  useAssignLeadOwner,
  useUpdateLeadStatus,
} from "@/hooks/use-crm-leads"
import { useBusinessUnits } from "@/hooks/use-business-units"
import { useOrganizationLeadStatuses } from "@/hooks/use-organization-lead-statuses"
import { LeadCommissionsPanel } from "@/components/dashboard/crm/lead-commissions-panel"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { cn } from "@/lib/utils"
import type { LeadStatus } from "@/schemas/crm.schema"

type EditableAttributionType = "closer" | "setter" | "ambassador"

/** Align with team role colors (`app/dashboard/team/page.tsx`). */
const attributionTypeColors: Record<string, string> = {
  closer: "bg-success/10 text-success",
  setter: "bg-success/10 text-success",
  ambassador: "bg-chart-2/10 text-chart-2",
  business_unit: "bg-primary/10 text-primary",
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  )
}

function AttributionTypeBadge({ type }: { type: string }) {
  const label =
    type === "business_unit" ? "Head" : type.charAt(0).toUpperCase() + type.slice(1)
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        attributionTypeColors[type] ?? "bg-muted text-foreground"
      )}
    >
      {label}
    </span>
  )
}

function isEditableAttributionType(value: string): value is EditableAttributionType {
  return value === "closer" || value === "setter" || value === "ambassador"
}

function attributionKey(memberId: number, type: string): string {
  return `${memberId}:${type}`
}

function formatAttributionPay(
  rate: number | null,
  fixed: number | null
): string {
  if (rate != null) return `${rate}%`
  if (fixed != null) return String(fixed)
  return "—"
}

export function LeadSidePanel({
  leadId,
  organizationId,
  changedByMemberId,
  salesMembers,
  attributionMembers,
  open,
  onOpenChange,
}: {
  leadId: number | null
  organizationId: number | null
  changedByMemberId: number | null
  salesMembers: SalesMemberOption[]
  attributionMembers: AttributionMemberOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { lead, statusHistory, isLoading } = useCrmLeadDetail({ leadId })
  const { mode: orgMode, can, scope, ownedBusinessUnitIds } = useOrgCapabilities()
  const canAssignOwner = orgMode.showLeadOwnerAssignment && can("crm.assign_sales")
  const canEditBusinessUnit = orgMode.showBusinessUnits && can("crm.leads.edit")
  const showOwnersSection = canAssignOwner || canEditBusinessUnit
  const canViewLeadCommissions =
    orgMode.showAcquisitionRoles && can("crm.view_lead_commissions")
  const canManageAttributions =
    canViewLeadCommissions && can("crm.manage_attributions")
  const canUpdateLeadStatus = can("crm.leads.update_status") || can("crm.leads.edit")
  const { fields } = useCrmFields(organizationId)
  const { units: businessUnits } = useBusinessUnits(organizationId)
  const { statuses: leadStatuses } = useOrganizationLeadStatuses(organizationId)
  const updateStatus = useUpdateLeadStatus(organizationId)
  const assignOwner = useAssignLeadOwner(organizationId)
  const assignBusinessUnit = useAssignLeadBusinessUnit(organizationId)
  const updateLeadFields = useUpdateLeadFields(leadId)
  const createAttribution = useCreateLeadAttribution(leadId)
  const updateAttribution = useUpdateLeadAttribution(leadId)
  const deleteAttribution = useDeleteLeadAttribution(leadId)

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [customFieldEditorOpen, setCustomFieldEditorOpen] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState<string>("")
  const [customFieldValue, setCustomFieldValue] = useState("")
  const [attributionEditorOpen, setAttributionEditorOpen] = useState(false)
  const [attributionMemberId, setAttributionMemberId] = useState<string>("")
  const [attributionType, setAttributionType] = useState<EditableAttributionType>("closer")
  const [commissionRateInput, setCommissionRateInput] = useState("")
  const [commissionFixedInput, setCommissionFixedInput] = useState("")
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null
    const id = Number(selectedFieldId)
    return fields.find((field) => field.id === id) ?? null
  }, [fields, selectedFieldId])

  const contactMeta = useMemo(() => {
    if (!lead) return ""
    const parts: string[] = [lead.email]
    if (lead.phone) parts.push(lead.phone)
    return parts.join(" · ")
  }, [lead])

  const ownersLocked = lead?.commissions_activated_at != null

  const businessUnitOptions = useMemo(() => {
    const active = businessUnits.filter((unit) => unit.status === "active")
    const scoped =
      scope === "bu"
        ? active.filter((unit) => ownedBusinessUnitIds.includes(unit.id))
        : active
    if (
      lead?.business_unit_id != null &&
      !scoped.some((unit) => unit.id === lead.business_unit_id)
    ) {
      const current = businessUnits.find((unit) => unit.id === lead.business_unit_id)
      if (current) return [...scoped, current]
    }
    return scoped
  }, [businessUnits, lead?.business_unit_id, ownedBusinessUnitIds, scope])

  function applyCommissionDefaults(
    memberIdRaw: string,
    type: EditableAttributionType
  ) {
    const memberId = Number(memberIdRaw)
    if (!Number.isFinite(memberId)) {
      setCommissionRateInput("")
      setCommissionFixedInput("")
      return
    }
    const member = attributionMembers.find((item) => item.memberId === memberId)
    if (!member) {
      setCommissionRateInput("")
      setCommissionFixedInput("")
      return
    }
    const defaults = memberDefaultsForAttributionType(member, type)
    setCommissionRateInput(defaults.rate == null ? "" : String(defaults.rate))
    setCommissionFixedInput(defaults.fixed == null ? "" : String(defaults.fixed))
  }

  function startEditAttribution(item: {
    member_id: number
    attribution_type: string
    commission_rate: number | null
    commission_fixed: number | null
  }) {
    if (!isEditableAttributionType(item.attribution_type)) return
    setEditingKey(attributionKey(item.member_id, item.attribution_type))
    setAttributionEditorOpen(false)
    setAttributionMemberId(String(item.member_id))
    setAttributionType(item.attribution_type)
    setCommissionRateInput(
      item.commission_rate == null ? "" : String(item.commission_rate)
    )
    setCommissionFixedInput(
      item.commission_fixed == null ? "" : String(item.commission_fixed)
    )
  }

  function resetAttributionForm() {
    setEditingKey(null)
    setAttributionMemberId("")
    setAttributionType("closer")
    setCommissionRateInput("")
    setCommissionFixedInput("")
    setAttributionEditorOpen(false)
  }

  function parseCommissionInputs(): {
    commissionRate: number | null
    commissionFixed: number | null
  } {
    const rateRaw = commissionRateInput.trim()
    const fixedRaw = commissionFixedInput.trim()
    const parsedRate = rateRaw ? Number(rateRaw) : null
    const parsedFixed = fixedRaw ? Number(fixedRaw) : null
    return {
      commissionRate:
        parsedRate !== null && Number.isFinite(parsedRate) ? parsedRate : null,
      commissionFixed:
        parsedFixed !== null && Number.isFinite(parsedFixed) ? parsedFixed : null,
    }
  }

  async function onAssignOwner(value: string) {
    if (!lead || ownersLocked) return
    await assignOwner.mutateAsync({
      leadId: lead.id,
      ownerId: value === "none" ? null : Number(value),
    })
  }

  async function onAssignBusinessUnit(value: string) {
    if (!lead || ownersLocked) return
    await assignBusinessUnit.mutateAsync({
      leadId: lead.id,
      businessUnitId: value === "none" ? null : Number(value),
    })
  }

  async function onStatusSubmit(input: { toStatus: LeadStatus; note: string }) {
    if (!lead) return
    await updateStatus.mutateAsync({
      leadId: lead.id,
      toStatus: input.toStatus,
      changedByMemberId,
      note: input.note,
    })
  }

  async function onAddCustomFieldValue() {
    if (!selectedField || !lead) return
    const value = customFieldValue.trim()
    if (!value) return
    await updateLeadFields.mutateAsync([
      {
        fieldDefId: selectedField.id,
        value,
      },
    ])
    setCustomFieldValue("")
  }

  async function onSaveAttribution() {
    const memberId = Number(attributionMemberId)
    if (!Number.isFinite(memberId)) return
    const { commissionRate, commissionFixed } = parseCommissionInputs()
    const attribution = {
      memberId,
      attributionType,
      commissionRate,
      commissionFixed,
    }

    if (editingKey) {
      const [prevMemberRaw, prevTypeRaw] = editingKey.split(":")
      const previousMemberId = Number(prevMemberRaw)
      if (!Number.isFinite(previousMemberId) || !isEditableAttributionType(prevTypeRaw)) {
        return
      }
      await updateAttribution.mutateAsync({
        previousMemberId,
        previousAttributionType: prevTypeRaw,
        attribution,
      })
    } else {
      await createAttribution.mutateAsync(attribution)
    }
    resetAttributionForm()
  }

  async function onRemoveAttribution(
    memberId: number,
    attributionTypeValue: EditableAttributionType
  ) {
    await deleteAttribution.mutateAsync({
      memberId,
      attributionType: attributionTypeValue,
    })
    if (editingKey === attributionKey(memberId, attributionTypeValue)) {
      resetAttributionForm()
    }
  }

  const attributionsLocked = lead?.commissions_activated_at != null
  const canEditAttributions = !attributionsLocked && canManageAttributions
  const attributionBusy =
    createAttribution.isPending ||
    updateAttribution.isPending ||
    deleteAttribution.isPending

  const attributionForm = (
    <div className="space-y-2">
      <SearchSelect
        value={attributionMemberId}
        onValueChange={(value) => {
          setAttributionMemberId(value)
          applyCommissionDefaults(value, attributionType)
        }}
        placeholder="Select member"
        searchPlaceholder="Search member…"
        emptyText="No member found."
        options={attributionMembers.map((member) => ({
          value: String(member.memberId),
          label: member.fullName ?? `Member #${member.memberId}`,
        }))}
      />
      <Select
        value={attributionType}
        onValueChange={(value) => {
          if (isEditableAttributionType(value)) {
            setAttributionType(value)
            applyCommissionDefaults(attributionMemberId, value)
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="closer">Closer</SelectItem>
          <SelectItem value="setter">Setter</SelectItem>
          <SelectItem value="ambassador">Ambassador</SelectItem>
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={commissionRateInput}
          onChange={(event) => setCommissionRateInput(event.target.value)}
          placeholder="Rate (%)"
        />
        <Input
          value={commissionFixedInput}
          onChange={(event) => setCommissionFixedInput(event.target.value)}
          placeholder="Fixed"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Prefills from member default for this role.
      </p>
      <div className="flex justify-end gap-2">
        {editingKey ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAttributionForm}
            disabled={attributionBusy}
          >
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          onClick={() => void onSaveAttribution()}
          disabled={!attributionMemberId || attributionBusy}
        >
          {editingKey ? "Save changes" : "Save"}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>Lead</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 p-4">
            {isLoading || !lead ? (
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-md bg-muted" />
                <div className="h-24 animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <>
                <div className="space-y-3 border-b border-border pb-4 pr-10">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-tight text-foreground">
                      {lead.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{contactMeta}</p>
                  </div>
                  <div className="flex items-center gap-2">
                      {lead.is_duplicate ? (
                        <span className="inline-flex rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          Already known
                        </span>
                      ) : null}
                    <LeadStatusBadge status={lead.status} catalog={leadStatuses} />
                    {canUpdateLeadStatus ? (
                      <Button size="sm" onClick={() => setStatusDialogOpen(true)}>
                        Update status
                      </Button>
                    ) : null}
                  </div>
                </div>

                <section className="space-y-3">
                  <SectionLabel>Answers</SectionLabel>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                    {lead.form_title ? (
                      <p className="text-xs text-muted-foreground">
                        Form:{" "}
                        <span className="font-medium text-foreground">{lead.form_title}</span>
                      </p>
                    ) : null}
                    {lead.crm_fields_all && Object.keys(lead.crm_fields_all).length > 0 ? (
                      <dl className="space-y-2">
                        {Object.entries(lead.crm_fields_all).map(([key, item]) => (
                          <div
                            key={key}
                            className="flex items-baseline justify-between gap-3 text-sm"
                          >
                            <dt className="text-muted-foreground">{item.label}</dt>
                            <dd className="text-right font-medium text-foreground">
                              {item.value || "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-xs text-muted-foreground">No answers yet.</p>
                    )}
                    <Collapsible
                      open={customFieldEditorOpen}
                      onOpenChange={setCustomFieldEditorOpen}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {customFieldEditorOpen ? "Cancel" : "+ Add field"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2 border-t border-border pt-3">
                        <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((field) => (
                              <SelectItem key={field.id} value={String(field.id)}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedField?.field_type === "select" &&
                        Array.isArray(selectedField.options) ? (
                          <Select
                            value={customFieldValue}
                            onValueChange={setCustomFieldValue}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedField.options.map((option) => (
                                <SelectItem key={option.value} value={option.label}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={customFieldValue}
                            onChange={(event) => setCustomFieldValue(event.target.value)}
                            placeholder="Enter value"
                          />
                        )}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={onAddCustomFieldValue}
                            disabled={
                              !selectedFieldId ||
                              !customFieldValue.trim() ||
                              updateLeadFields.isPending
                            }
                          >
                            Save
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </section>

                {showOwnersSection ? (
                  <section className="space-y-3">
                    <SectionLabel>Owners</SectionLabel>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      {canEditBusinessUnit ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Business unit</p>
                          <SearchSelect
                            value={
                              lead.business_unit_id != null
                                ? String(lead.business_unit_id)
                                : "none"
                            }
                            onValueChange={onAssignBusinessUnit}
                            disabled={ownersLocked || assignBusinessUnit.isPending}
                            placeholder="Assign business unit"
                            searchPlaceholder="Search business units…"
                            emptyText="No business unit found."
                            noneOption={{ value: "none", label: "Unassigned" }}
                            options={businessUnitOptions.map((unit) => ({
                              value: String(unit.id),
                              label: unit.name,
                            }))}
                          />
                        </div>
                      ) : null}
                      {canAssignOwner ? (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground">Owner</p>
                          <SearchSelect
                            value={lead.owner_id ? String(lead.owner_id) : "none"}
                            onValueChange={onAssignOwner}
                            disabled={ownersLocked || assignOwner.isPending}
                            placeholder="Assign owner"
                            searchPlaceholder="Search team…"
                            emptyText="No team member found."
                            noneOption={{ value: "none", label: "Unassigned" }}
                            options={salesMembers.map((member) => ({
                              value: String(member.memberId),
                              label: member.fullName ?? `Member #${member.memberId}`,
                            }))}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Assigning an owner emails them the lead details.
                          </p>
                        </div>
                      ) : null}
                      {ownersLocked ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <CircleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          Locked after commissions are activated.
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {canViewLeadCommissions ? (
                  <section className="space-y-3">
                    <div className="space-y-0.5">
                      <SectionLabel>Commissions</SectionLabel>
                      <p className="text-xs text-muted-foreground">
                        Who is paid on this lead, then link the sale and activate.
                      </p>
                    </div>

                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-foreground">Roles</p>
                        {lead.attributions && lead.attributions.length > 0 ? (
                          <ul className="space-y-2">
                            {lead.attributions.map((item, idx) => {
                              const key = attributionKey(
                                item.member_id,
                                item.attribution_type
                              )
                              const editable =
                                canEditAttributions &&
                                isEditableAttributionType(item.attribution_type)
                              const isEditing = editingKey === key

                              return (
                                <li key={`${key}-${idx}`} className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <AttributionTypeBadge type={item.attribution_type} />
                                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                      {item.member_name ?? `Member #${item.member_id}`}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {formatAttributionPay(
                                        item.commission_rate,
                                        item.commission_fixed
                                      )}
                                    </span>
                                    {editable ? (
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground"
                                          disabled={attributionBusy}
                                          onClick={() => startEditAttribution(item)}
                                          aria-label="Edit attribution"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          disabled={attributionBusy}
                                          onClick={() => {
                                            if (
                                              isEditableAttributionType(item.attribution_type)
                                            ) {
                                              void onRemoveAttribution(
                                                item.member_id,
                                                item.attribution_type
                                              )
                                            }
                                          }}
                                          aria-label="Remove attribution"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    ) : null}
                                  </div>
                                  {isEditing ? (
                                    <div className="rounded-md border border-border bg-background p-3">
                                      {attributionForm}
                                    </div>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No roles yet.</p>
                        )}

                        {canEditAttributions && !editingKey ? (
                          <Collapsible
                            open={attributionEditorOpen}
                            onOpenChange={setAttributionEditorOpen}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between"
                              >
                                <span>Add role</span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    attributionEditorOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2 border-t border-border pt-3">
                              {attributionForm}
                            </CollapsibleContent>
                          </Collapsible>
                        ) : null}

                        {attributionsLocked ? (
                          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CircleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            Locked after commissions are activated.
                          </p>
                        ) : null}
                      </div>

                      <div className="border-t border-border pt-3">
                        <LeadCommissionsPanel
                          lead={lead}
                          organizationId={organizationId ?? lead.organization_id}
                          activatedByMemberId={changedByMemberId}
                          embedded
                        />
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="space-y-3">
                  <SectionLabel>Activity</SectionLabel>
                  <LeadTimeline rows={statusHistory} catalog={leadStatuses} />
                </section>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {lead ? (
        <UpdateStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          currentStatus={lead.status}
          statuses={leadStatuses}
          onSubmit={onStatusSubmit}
          isPending={updateStatus.isPending}
        />
      ) : null}
    </>
  )
}
