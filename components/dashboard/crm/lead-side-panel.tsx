"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
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
import { useCreateLeadAttribution, useCrmLeadDetail } from "@/hooks/use-crm-lead-detail"
import { useCrmFields } from "@/hooks/use-crm-fields"
import { useUpdateLeadFields } from "@/hooks/use-crm-lead-detail"
import { useUpdateLeadAssignment, useUpdateLeadStatus } from "@/hooks/use-crm-leads"
import { LeadCommissionsPanel } from "@/components/dashboard/crm/lead-commissions-panel"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import type { LeadStatus } from "@/schemas/crm.schema"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h4>
  )
}

function AttributionTypeBadge({ type }: { type: string }) {
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  return (
    <span className="shrink-0 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  )
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
  const { mode: orgMode, can } = useOrgCapabilities()
  const canAssignSales = orgMode.showLeadSalesAssignment && can("crm.assign_sales")
  const canManageAttributions =
    orgMode.showAcquisitionRoles && can("crm.manage_attributions")
  const canUpdateLeadStatus = can("crm.leads.update_status") || can("crm.leads.edit")
  const { fields } = useCrmFields(organizationId)
  const updateStatus = useUpdateLeadStatus(organizationId)
  const updateAssignment = useUpdateLeadAssignment(organizationId)
  const updateLeadFields = useUpdateLeadFields(leadId)
  const createAttribution = useCreateLeadAttribution(leadId)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [customFieldEditorOpen, setCustomFieldEditorOpen] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState<string>("")
  const [customFieldValue, setCustomFieldValue] = useState("")
  const [attributionEditorOpen, setAttributionEditorOpen] = useState(false)
  const [attributionMemberId, setAttributionMemberId] = useState<string>("")
  const [attributionType, setAttributionType] = useState<"closer" | "setter" | "ambassador">("closer")
  const [commissionRateInput, setCommissionRateInput] = useState("")
  const [commissionFixedInput, setCommissionFixedInput] = useState("")

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null
    const id = Number(selectedFieldId)
    return fields.find((field) => field.id === id) ?? null
  }, [fields, selectedFieldId])

  const contactMeta = useMemo(() => {
    if (!lead) return ""
    const parts: string[] = [lead.email]
    if (lead.phone) parts.push(lead.phone)
    if (lead.business_unit_name) parts.push(lead.business_unit_name)
    return parts.join(" · ")
  }, [lead])

  function applyCommissionDefaults(
    memberIdRaw: string,
    type: "closer" | "setter" | "ambassador"
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

  async function onAssign(value: string) {
    if (!lead) return
    await updateAssignment.mutateAsync({
      leadId: lead.id,
      assignedSalesId: value === "none" ? null : Number(value),
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

  async function onAddAttribution() {
    const memberId = Number(attributionMemberId)
    if (!Number.isFinite(memberId)) return
    const rateRaw = commissionRateInput.trim()
    const fixedRaw = commissionFixedInput.trim()
    const parsedRate = rateRaw ? Number(rateRaw) : null
    const parsedFixed = fixedRaw ? Number(fixedRaw) : null

    await createAttribution.mutateAsync({
      memberId,
      attributionType,
      commissionRate:
        parsedRate !== null && Number.isFinite(parsedRate) ? parsedRate : null,
      commissionFixed:
        parsedFixed !== null && Number.isFinite(parsedFixed) ? parsedFixed : null,
    })

    setAttributionMemberId("")
    setAttributionType("closer")
    setCommissionRateInput("")
    setCommissionFixedInput("")
    setAttributionEditorOpen(false)
  }

  const attributionsLocked = lead?.commissions_activated_at != null

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
                {/* Contact header — pr reserves space for Sheet close (absolute top-right) */}
                <div className="space-y-2 border-b border-border pb-4 pr-10">
                  <h3 className="text-lg font-semibold leading-tight text-foreground">
                    {lead.full_name}
                  </h3>
                  {lead.is_duplicate ? (
                    <span className="inline-flex rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                      Already known
                    </span>
                  ) : null}
                  <p className="text-sm text-muted-foreground">{contactMeta}</p>
                </div>

                {/* Pipeline */}
                <section className="space-y-3">
                  <SectionLabel>Pipeline</SectionLabel>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      {canUpdateLeadStatus ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatusDialogOpen(true)}
                        >
                          Update
                        </Button>
                      ) : null}
                    </div>
                    {canAssignSales ? (
                      <div className="space-y-1.5">
                        <span className="text-sm text-muted-foreground">Assigned sales</span>
                        <SearchSelect
                          value={lead.assigned_sales_id ? String(lead.assigned_sales_id) : "none"}
                          onValueChange={onAssign}
                          disabled={updateAssignment.isPending}
                          placeholder="Assign sales"
                          searchPlaceholder="Search sales…"
                          emptyText="No sales member found."
                          noneOption={{ value: "none", label: "Unassigned" }}
                          options={salesMembers.map((member) => ({
                            value: String(member.memberId),
                            label: member.fullName ?? `Member #${member.memberId}`,
                          }))}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* Team & pay — team mode only */}
                {orgMode.showAcquisitionRoles ? (
                  <section className="space-y-3">
                    <div className="space-y-0.5">
                      <SectionLabel>Team & pay</SectionLabel>
                      <p className="text-xs text-muted-foreground">
                        Who is credited on this lead
                      </p>
                    </div>
                    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
                      {lead.attributions && lead.attributions.length > 0 ? (
                        <ul className="space-y-2">
                          {lead.attributions.map((item, idx) => (
                            <li
                              key={`${item.member_id}-${idx}`}
                              className="flex items-center gap-2 text-sm"
                            >
                              <AttributionTypeBadge type={item.attribution_type} />
                              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                {item.member_name ?? `Member #${item.member_id}`}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.commission_rate != null
                                  ? `${item.commission_rate}%`
                                  : item.commission_fixed != null
                                    ? String(item.commission_fixed)
                                    : "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">No attributions yet.</p>
                      )}

                      {!attributionsLocked && canManageAttributions ? (
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
                              <span>Add attribution</span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  attributionEditorOpen ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2 border-t border-border pt-3">
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
                                if (
                                  value === "closer" ||
                                  value === "setter" ||
                                  value === "ambassador"
                                ) {
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
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={onAddAttribution}
                                disabled={!attributionMemberId || createAttribution.isPending}
                              >
                                Save
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Attributions locked (commissions active).
                        </p>
                      )}

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

                {/* Details */}
                <section className="space-y-3">
                  <SectionLabel>Details</SectionLabel>
                  <div className="space-y-2">
                    {lead.crm_fields_all && Object.keys(lead.crm_fields_all).length > 0 ? (
                      <ul className="divide-y divide-border rounded-lg border border-border bg-muted/50">
                        {Object.entries(lead.crm_fields_all).map(([key, item]) => (
                          <li
                            key={key}
                            className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="text-right font-medium text-foreground">
                              {item.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No custom fields.</p>
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
                      <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-border p-3">
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
                          <Select value={customFieldValue} onValueChange={setCustomFieldValue}>
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

                {/* Activity */}
                <section className="space-y-3">
                  <SectionLabel>Activity</SectionLabel>
                  <LeadTimeline rows={statusHistory} />
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
          onSubmit={onStatusSubmit}
          isPending={updateStatus.isPending}
        />
      ) : null}
    </>
  )
}
