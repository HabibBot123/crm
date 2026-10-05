"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Lead } from "@/schemas/crm.schema"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useActivateLeadCommissions,
  useCancelLeadCommissions,
  useLeadEnrollmentMatches,
  useLinkLeadEnrollment,
} from "@/hooks/use-commissions"

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function formatActivatedAt(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function LeadCommissionsPanel({
  lead,
  organizationId,
  activatedByMemberId,
  embedded = false,
}: {
  lead: Lead
  organizationId: number
  activatedByMemberId: number | null
  /** When true, omit outer Commissions heading (parent section already labeled). */
  embedded?: boolean
}) {
  const { can } = useOrgCapabilities()
  const canActivateCommissions = can("crm.activate_commissions")
  const activate = useActivateLeadCommissions(organizationId)
  const cancel = useCancelLeadCommissions(organizationId)
  const linkEnrollment = useLinkLeadEnrollment(organizationId)
  const { data: matches = [], isLoading: matchesLoading } = useLeadEnrollmentMatches(
    organizationId,
    lead.email
  )

  const [saleSource, setSaleSource] = useState<"platform" | "manual">(
    lead.sale_source === "manual" ? "manual" : "platform"
  )
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>(
    lead.enrollment_id == null ? "" : String(lead.enrollment_id)
  )
  const [manualAmountEuros, setManualAmountEuros] = useState("")
  const [manualPackTitle, setManualPackTitle] = useState("")
  const [manualInstallments, setManualInstallments] = useState("1")

  const locked = lead.commissions_activated_at != null
  const canManage = lead.status === "converted"

  const selectedMatch = useMemo(
    () => matches.find((item) => String(item.id) === selectedEnrollmentId) ?? null,
    [matches, selectedEnrollmentId]
  )

  if (!canManage) {
    if (embedded) {
      return (
        <p className="text-xs text-muted-foreground">
          Commissions available when status is Converted.
        </p>
      )
    }
    return null
  }

  if (!canActivateCommissions) {
    if (embedded) {
      return locked ? (
        <p className="text-sm text-foreground">
          <span className="font-medium">Commissions active</span>
          {lead.commissions_activated_at ? (
            <span className="text-muted-foreground">
              {" "}
              · {formatActivatedAt(lead.commissions_activated_at)}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          You don’t have permission to activate commissions.
        </p>
      )
    }
    return null
  }

  const body = locked ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-foreground">
        <span className="font-medium">Commissions active</span>
        {lead.commissions_activated_at ? (
          <span className="text-muted-foreground">
            {" "}
            · {formatActivatedAt(lead.commissions_activated_at)}
          </span>
        ) : null}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={cancel.isPending}
        onClick={() => cancel.mutate(lead.id)}
      >
        {cancel.isPending ? "Canceling…" : "Cancel"}
      </Button>
    </div>
  ) : (
    <div className="space-y-3">
      {!embedded ? (
        <p className="text-xs text-muted-foreground">Activate payouts for this converted lead.</p>
      ) : (
        <p className="text-xs font-medium text-foreground">Activate commissions</p>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Sale source</Label>
        <Select
          value={saleSource}
          onValueChange={(value) => {
            if (value === "platform" || value === "manual") setSaleSource(value)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="platform">Via platform</SelectItem>
            <SelectItem value="manual">Manual (off-platform)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {saleSource === "platform" ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Link enrollment</Label>
          {matchesLoading ? (
            <p className="text-xs text-muted-foreground">Looking up purchases…</p>
          ) : matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No purchase for {lead.email}.
            </p>
          ) : (
            <Select
              value={selectedEnrollmentId}
              onValueChange={async (value) => {
                setSelectedEnrollmentId(value)
                await linkEnrollment.mutateAsync({
                  leadId: lead.id,
                  enrollmentId: Number(value),
                  saleSource: "platform",
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select purchase" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    #{item.id}
                    {item.offer_title ? ` · ${item.offer_title}` : ""} ·{" "}
                    {new Date(item.started_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Pack title</Label>
            <Input
              value={manualPackTitle}
              onChange={(event) => setManualPackTitle(event.target.value)}
              placeholder="Offer / pack name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gross price (EUR)</Label>
            <Input
              inputMode="decimal"
              value={manualAmountEuros}
              onChange={(event) => setManualAmountEuros(event.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Installments</Label>
            <Input
              inputMode="numeric"
              value={manualInstallments}
              onChange={(event) => setManualInstallments(event.target.value)}
              placeholder="1"
            />
          </div>
        </div>
      )}

      <Button
        size="sm"
        disabled={activate.isPending || activatedByMemberId == null}
        onClick={async () => {
          if (activatedByMemberId == null) return
          if (saleSource === "platform") {
            const enrollmentId = selectedEnrollmentId
              ? Number(selectedEnrollmentId)
              : lead.enrollment_id
            await activate.mutateAsync({
              lead_id: lead.id,
              sale_source: "platform",
              enrollment_id: enrollmentId,
              activated_by_member_id: activatedByMemberId,
            })
            return
          }
          const euros = Number(manualAmountEuros)
          const installments = Number(manualInstallments || "1")
          if (!Number.isFinite(euros) || euros <= 0) return
          if (!Number.isFinite(installments) || installments < 1) return
          await activate.mutateAsync({
            lead_id: lead.id,
            sale_source: "manual",
            activated_by_member_id: activatedByMemberId,
            amount_gross_cents: Math.round(euros * 100),
            pack_title: manualPackTitle.trim() || "Manual sale",
            installment_count: installments,
            offer_id: lead.target_offer_id,
          })
        }}
      >
        {activate.isPending ? "Activating…" : "Activate"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Uses attribution rates. Preview on the Commissions page
        {saleSource === "platform" && selectedMatch ? ` · #${selectedMatch.id}` : ""}.
      </p>
    </div>
  )

  if (embedded) {
    return body
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Commissions
      </h4>
      <div className="space-y-3 rounded-lg border border-border p-3">{body}</div>
    </div>
  )
}

export function formatCommissionCents(cents: number): string {
  return formatCents(cents)
}
