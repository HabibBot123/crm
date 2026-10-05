"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchSelect } from "@/components/ui/search-select"
import { useTeamMembers } from "@/hooks/use-team"
import { useCrmForms, useCrmFormDetail } from "@/hooks/use-crm-forms"
import { useBusinessUnits } from "@/hooks/use-business-units"
import type { CrmFormSummary } from "@/schemas/crm.schema"
import type { TeamMember } from "@/lib/services/team"

export type CreateAmbassadorLinkDialogPayload = {
  member_id: number
  form_id: number
  label: string
  business_unit_id: number | null
  default_field_values: Record<string, string>
}

function formatMemberLabel(member: TeamMember): string {
  const name = member.full_name?.trim()
  const email = member.email?.trim()
  if (name && email) return `${name} · ${email}`
  if (email) return email
  if (name) return name
  return `Member #${member.id}`
}

function formatFormLabel(form: CrmFormSummary): string {
  return form.title
}

/**
 * Only mounted when the user can pick any member (`canSelectMember`).
 * `useTeamMembers` therefore never runs for non–admin-scope users.
 */
function AmbassadorMemberPicker({
  organizationId,
  value,
  onValueChange,
}: {
  organizationId: number
  value: number | null
  onValueChange: (memberId: number | null) => void
}) {
  const { data, isLoading, error } = useTeamMembers({
    organizationId,
    page: 1,
    pageSize: 100,
  })

  const sortedMembers = useMemo(() => {
    const items = data.items ?? []
    const active = items.filter((m) => m.status === "active")
    return [...active].sort((a, b) => formatMemberLabel(a).localeCompare(formatMemberLabel(b)))
  }, [data.items])

  return (
    <SearchSelect
      value={value ? String(value) : ""}
      onValueChange={(v) => {
        const parsed = Number(v)
        if (Number.isFinite(parsed)) onValueChange(parsed)
      }}
      disabled={isLoading}
      placeholder={
        isLoading
          ? "Loading members…"
          : error
            ? "Failed to load members"
            : "Select a member"
      }
      searchPlaceholder="Search member…"
      emptyText={
        error
          ? "Failed to load members"
          : sortedMembers.length === 0
            ? "No active members"
            : "No member found."
      }
      options={sortedMembers.map((m) => ({
        value: String(m.id),
        label: formatMemberLabel(m),
      }))}
    />
  )
}

function AmbassadorFormPicker({
  forms,
  isLoading,
  hasError,
  value,
  onValueChange,
}: {
  forms: CrmFormSummary[]
  isLoading: boolean
  hasError: boolean
  value: number | null
  onValueChange: (formId: number | null) => void
}) {
  const sortedForms = useMemo(() => {
    return [...forms]
      .filter((f) => f.status === "active")
      .sort((a, b) => formatFormLabel(a).localeCompare(formatFormLabel(b)))
  }, [forms])

  return (
    <SearchSelect
      value={value ? String(value) : ""}
      onValueChange={(v) => {
        const parsed = Number(v)
        if (Number.isFinite(parsed)) onValueChange(parsed)
      }}
      disabled={isLoading}
      placeholder={
        isLoading
          ? "Loading forms…"
          : hasError
            ? "Failed to load forms"
            : "Select a form"
      }
      searchPlaceholder="Search form…"
      emptyText={
        hasError
          ? "Failed to load forms"
          : sortedForms.length === 0
            ? "No active forms"
            : "No form found."
      }
      options={sortedForms.map((f) => ({
        value: String(f.id),
        label: formatFormLabel(f),
      }))}
    />
  )
}

export function CreateAmbassadorLinkDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  organizationId,
  canSelectMember,
  selfMemberId,
  basePublicPath,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateAmbassadorLinkDialogPayload) => Promise<void>
  isPending?: boolean
  organizationId: number
  /** When false, the link is always created for `selfMemberId` (no member picker). */
  canSelectMember: boolean
  /** Required when `canSelectMember` is false. Ignored when picking any member (admin scope). */
  selfMemberId?: number
  basePublicPath: string
}) {
  const [label, setLabel] = useState("")
  const [memberId, setMemberId] = useState<number | null>(null)
  const [formId, setFormId] = useState<number | null>(null)
  const [businessUnitId, setBusinessUnitId] = useState<number | null>(null)
  const [hiddenDefaults, setHiddenDefaults] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setLabel("")
      setMemberId(null)
      setFormId(null)
      setBusinessUnitId(null)
      setHiddenDefaults({})
    }
  }, [open])

  const { forms, isLoading: formsLoading, error: formsError } = useCrmForms(open ? organizationId : null)
  const { form: selectedFormDetail } = useCrmFormDetail(open && formId ? formId : null)
  const { units } = useBusinessUnits(open ? organizationId : null)

  const selectedForm = useMemo(() => {
    if (!formId) return null
    return forms.find((f) => f.id === formId) ?? null
  }, [formId, forms])

  const hiddenFields = useMemo(
    () => (selectedFormDetail?.fields ?? []).filter((field) => field.visibility === "hidden"),
    [selectedFormDetail?.fields]
  )

  const publicLinkPreview = useMemo(() => {
    if (!basePublicPath.trim()) return ""
    const formSlug = selectedForm?.slug?.trim()
    if (!formSlug) return `${basePublicPath}/[form-slug]?ref=...`
    return `${basePublicPath}/${formSlug}?ref=...`
  }, [basePublicPath, selectedForm?.slug])

  const resolvedMemberId = canSelectMember ? memberId : selfMemberId
  const canSubmit =
    !!label.trim() &&
    !!formId &&
    resolvedMemberId != null &&
    (canSelectMember ? memberId != null : selfMemberId != null)

  async function handleSubmit() {
    if (!canSubmit || resolvedMemberId == null || formId == null) return
    const defaults: Record<string, string> = {}
    for (const [key, value] of Object.entries(hiddenDefaults)) {
      const trimmed = value.trim()
      if (trimmed.length > 0) defaults[key] = trimmed
    }
    await onSubmit({
      label: label.trim(),
      member_id: resolvedMemberId,
      form_id: formId,
      business_unit_id: businessUnitId,
      default_field_values: defaults,
    })
    setLabel("")
    setMemberId(null)
    setFormId(null)
    setBusinessUnitId(null)
    setHiddenDefaults({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create share link</DialogTitle>
          <DialogDescription>
            {canSelectMember
              ? "Create a tracked URL for a team member and form. Use the label for the channel (Instagram, TikTok…)."
              : "Create a tracked URL for a form. Use the label for the channel (Instagram, TikTok…)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {canSelectMember && open ? (
            <AmbassadorMemberPicker
              organizationId={organizationId}
              value={memberId}
              onValueChange={setMemberId}
            />
          ) : null}

          {open ? (
            <AmbassadorFormPicker
              forms={forms}
              isLoading={formsLoading}
              hasError={!!formsError}
              value={formId}
              onValueChange={(nextFormId) => {
                setFormId(nextFormId)
                setHiddenDefaults({})
              }}
            />
          ) : null}

          <div className="space-y-1.5">
            <Label>Channel label</Label>
            <Input
              placeholder="e.g. Instagram bio, TikTok ad, Webinar partner…"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Business unit (optional)</Label>
            <SearchSelect
              value={businessUnitId ? String(businessUnitId) : "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  setBusinessUnitId(null)
                  return
                }
                const parsed = Number(value)
                if (Number.isFinite(parsed)) setBusinessUnitId(parsed)
              }}
              placeholder="No business unit"
              searchPlaceholder="Search business unit…"
              emptyText="No business unit found."
              noneOption={{ value: "none", label: "No business unit" }}
              options={units.map((unit) => ({
                value: String(unit.id),
                label: unit.name,
              }))}
            />
          </div>

          {hiddenFields.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hidden field defaults
              </p>
              {hiddenFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    value={hiddenDefaults[field.key] ?? ""}
                    onChange={(event) =>
                      setHiddenDefaults((previous) => ({
                        ...previous,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.key}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Public link preview
            </p>
            <p className="mt-1 break-all text-sm text-foreground">{publicLinkPreview}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || !!isPending}>
            Create link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
