"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Lead, PreviewLeadCommissionsInput } from "@/schemas/crm.schema"
import type { AcquisitionPreviewResult } from "@/lib/commissions/compute-acquisition"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useOffers } from "@/hooks/use-offers"
import {
  useActivateLeadCommissions,
  useCancelLeadCommissions,
  useLeadEnrollmentMatches,
  usePreviewLeadCommissions,
} from "@/hooks/use-commissions"
import { useRecordLeadSale } from "@/hooks/use-sales"
import { formatAmountFromCents } from "@/lib/utils"

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

function formatDueAt(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRateOrFixed(rate: number | null, fixed: number | null): string {
  if (fixed != null && fixed > 0) return formatCents(fixed)
  if (rate != null && rate > 0) return `${rate}%`
  return "—"
}

function centsToMajorString(cents: number): string {
  return (cents / 100).toFixed(2)
}

function majorStringToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

type AccessMode = "lifetime" | "months"
type RecordMode = "create" | "link" | "sale_only"

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
  const canRecordSale = can("clients.enroll_manual") || canActivateCommissions
  const preview = usePreviewLeadCommissions()
  const activate = useActivateLeadCommissions(organizationId)
  const cancel = useCancelLeadCommissions(organizationId)
  const recordSale = useRecordLeadSale(organizationId)
  const { offers, isLoading: offersLoading } = useOffers(organizationId, "active")

  const [recordMode, setRecordMode] = useState<RecordMode>(() =>
    can("clients.enroll_manual") ? "create" : "link"
  )
  const [offerId, setOfferId] = useState("")
  const [priceMajor, setPriceMajor] = useState("")
  const [accessMode, setAccessMode] = useState<AccessMode>("lifetime")
  const [accessMonths, setAccessMonths] = useState("1")
  const [soldAt, setSoldAt] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(
    lead.enrollment_id == null ? "" : String(lead.enrollment_id)
  )
  const [linkEmailInput, setLinkEmailInput] = useState(lead.email)
  const [linkEmailLookup, setLinkEmailLookup] = useState(lead.email)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewResult, setPreviewResult] = useState<AcquisitionPreviewResult | null>(null)
  const [pendingActivate, setPendingActivate] = useState<PreviewLeadCommissionsInput | null>(null)

  const locked = lead.commissions_activated_at != null
  const canManage = lead.status === "converted"
  const hasSale = lead.organization_sale_id != null
  const busy = preview.isPending || activate.isPending || recordSale.isPending

  const { data: matches = [], isLoading: matchesLoading } = useLeadEnrollmentMatches(
    organizationId,
    recordMode === "link" || hasSale ? linkEmailLookup : null
  )

  const selectedOffer = useMemo(
    () => offers.find((item) => String(item.id) === offerId) ?? null,
    [offers, offerId]
  )

  const canSubmitRecordSale = useMemo(() => {
    if (recordMode === "link") {
      const enrollmentId = Number(selectedEnrollmentId)
      return Number.isFinite(enrollmentId) && enrollmentId > 0
    }
    const priceCents = majorStringToCents(priceMajor)
    if (recordMode === "sale_only") {
      const offerIdNum = Number(offerId)
      return (
        priceCents != null &&
        priceCents > 0 &&
        Number.isFinite(offerIdNum) &&
        offerIdNum > 0
      )
    }
    if (recordMode === "create") {
      const offerIdNum = Number(offerId)
      if (!Number.isFinite(offerIdNum) || offerIdNum <= 0) return false
      if (priceCents == null) return false
      if (accessMode === "months") {
        const months = Number(accessMonths)
        return Number.isFinite(months) && months > 0 && Number.isInteger(months)
      }
      return true
    }
    return false
  }, [recordMode, selectedEnrollmentId, priceMajor, offerId, accessMode, accessMonths])

  useEffect(() => {
    if (!selectedOffer) return
    setPriceMajor(centsToMajorString(selectedOffer.price))
    if (
      selectedOffer.access_duration_months != null &&
      selectedOffer.access_duration_months > 0
    ) {
      setAccessMode("months")
      setAccessMonths(String(selectedOffer.access_duration_months))
    } else {
      setAccessMode("lifetime")
      setAccessMonths("1")
    }
  }, [selectedOffer])

  useEffect(() => {
    setSelectedEnrollmentId(lead.enrollment_id == null ? "" : String(lead.enrollment_id))
  }, [lead.enrollment_id])

  useEffect(() => {
    setLinkEmailInput(lead.email)
    setLinkEmailLookup(lead.email)
  }, [lead.id, lead.email])

  function applyLinkEmailLookup() {
    const next = linkEmailInput.trim().toLowerCase()
    if (!next) return
    setLinkEmailLookup(next)
    setSelectedEnrollmentId("")
  }

  async function onRecordSale() {
    if (recordMode === "link") {
      const enrollmentId = Number(selectedEnrollmentId)
      if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) return
      await recordSale.mutateAsync({
        leadId: lead.id,
        input: {
          mode: "link",
          enrollment_id: enrollmentId,
          sold_at: soldAt,
        },
      })
      return
    }

    const priceCents = majorStringToCents(priceMajor)
    if (priceCents == null) return

    if (recordMode === "sale_only") {
      if (priceCents <= 0) return
      const offerIdNum = Number(offerId)
      if (!Number.isFinite(offerIdNum) || offerIdNum <= 0) return
      await recordSale.mutateAsync({
        leadId: lead.id,
        input: {
          mode: "sale_only",
          price_cents: priceCents,
          offer_id: offerIdNum,
          sold_at: soldAt,
        },
      })
      return
    }

    const offerIdNum = Number(offerId)
    if (!Number.isFinite(offerIdNum) || offerIdNum <= 0) return

    let accessDurationMonths: number | null = null
    if (accessMode === "months") {
      const months = Number(accessMonths)
      if (!Number.isFinite(months) || months <= 0 || !Number.isInteger(months)) return
      accessDurationMonths = months
    }

    await recordSale.mutateAsync({
      leadId: lead.id,
      input: {
        mode: "create",
        offer_id: offerIdNum,
        price_cents: priceCents,
        access_duration_months: accessDurationMonths,
        sold_at: soldAt,
      },
    })
  }

  async function onReviewActivate() {
    if (lead.organization_sale_id == null) return
    const input: PreviewLeadCommissionsInput = {
      lead_id: lead.id,
      sale_source: lead.sale_source === "manual" ? "manual" : "platform",
      enrollment_id: lead.enrollment_id,
    }
    const result = await preview.mutateAsync(input)
    setPendingActivate(input)
    setPreviewResult(result)
    setPreviewOpen(true)
  }

  async function onConfirmActivate() {
    if (activatedByMemberId == null || pendingActivate == null) return
    await activate.mutateAsync({
      ...pendingActivate,
      activated_by_member_id: activatedByMemberId,
    })
    setPreviewOpen(false)
    setPreviewResult(null)
    setPendingActivate(null)
  }

  if (!canManage) {
    if (embedded) {
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Activate commissions</p>
          <p className="text-xs text-muted-foreground">
            Available when status is Converted.
          </p>
        </div>
      )
    }
    return null
  }

  if (!canActivateCommissions && !canRecordSale) {
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
          You don’t have permission to record sales or activate commissions.
        </p>
      )
    }
    return null
  }

  let body: ReactNode

  if (locked) {
    body = (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Commissions active</p>
          <dl className="space-y-1 text-xs text-muted-foreground">
            {lead.commissions_activated_at ? (
              <div className="flex justify-between gap-3">
                <dt>Activated</dt>
                <dd className="text-foreground">
                  {formatActivatedAt(lead.commissions_activated_at)}
                </dd>
              </div>
            ) : null}
            {lead.organization_sale_id != null ? (
              <div className="flex justify-between gap-3">
                <dt>Sale</dt>
                <dd className="text-foreground">#{lead.organization_sale_id}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt>Enrollment</dt>
              <dd className="text-foreground">
                {lead.enrollment_id != null ? `#${lead.enrollment_id}` : "None"}
              </dd>
            </div>
          </dl>
        </div>
        {canActivateCommissions ? (
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(lead.id)}
          >
            {cancel.isPending ? "Canceling…" : "Cancel commissions"}
          </Button>
        ) : null}
      </div>
    )
  } else if (!hasSale) {
    body = (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">1. Record sale</p>
          <p className="text-xs text-muted-foreground">
            Link the lead to a sale before activating commissions.
          </p>
        </div>

        {canRecordSale ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode</Label>
              <Select
                value={recordMode}
                onValueChange={(value) => {
                  if (value === "create" || value === "link" || value === "sale_only") {
                    setRecordMode(value)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {can("clients.enroll_manual") ? (
                    <SelectItem value="create">Create client + sale</SelectItem>
                  ) : null}
                  <SelectItem value="link">Link existing client</SelectItem>
                  <SelectItem value="sale_only">Sale only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recordMode === "create" && can("clients.enroll_manual") ? (
              <div className="grid gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Offer</Label>
                  <Select
                    value={offerId || undefined}
                    onValueChange={setOfferId}
                    disabled={offersLoading || offers.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          offersLoading
                            ? "Loading offers…"
                            : offers.length === 0
                              ? "No active offers"
                              : "Select offer"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {offers.map((offer) => (
                        <SelectItem key={offer.id} value={String(offer.id)}>
                          {offer.title} · {formatAmountFromCents(offer.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gross price (EUR)</Label>
                  <Input
                    inputMode="decimal"
                    value={priceMajor}
                    onChange={(event) => setPriceMajor(event.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Access</Label>
                  <Select
                    value={accessMode}
                    onValueChange={(value) => {
                      if (value === "lifetime" || value === "months") setAccessMode(value)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="months">Limited months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {accessMode === "months" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Months</Label>
                    <Input
                      inputMode="numeric"
                      value={accessMonths}
                      onChange={(event) => setAccessMonths(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {recordMode === "sale_only" ? (
              <div className="grid gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gross price (EUR)</Label>
                  <Input
                    inputMode="decimal"
                    value={priceMajor}
                    onChange={(event) => setPriceMajor(event.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Offer</Label>
                  <Select
                    value={offerId || undefined}
                    onValueChange={setOfferId}
                    disabled={offersLoading || offers.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select offer" />
                    </SelectTrigger>
                    <SelectContent>
                      {offers.map((offer) => (
                        <SelectItem key={offer.id} value={String(offer.id)}>
                          {offer.title} · {formatAmountFromCents(offer.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {recordMode === "link" ? (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Buyer email to search</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={linkEmailInput}
                      onChange={(event) => setLinkEmailInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          applyLinkEmailLookup()
                        }
                      }}
                      placeholder="email@example.com"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={
                        matchesLoading ||
                        linkEmailInput.trim().toLowerCase() === linkEmailLookup.trim().toLowerCase()
                      }
                      onClick={applyLinkEmailLookup}
                    >
                      Search
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Enrollment</Label>
                  {matchesLoading ? (
                    <p className="text-xs text-muted-foreground">Looking up purchases…</p>
                  ) : matches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No enrollment for {linkEmailLookup}. Try another email, create an
                      enrollment, or use Sale only.
                    </p>
                  ) : (
                    <Select
                      value={selectedEnrollmentId || undefined}
                      onValueChange={setSelectedEnrollmentId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select purchase" />
                      </SelectTrigger>
                      <SelectContent>
                        {matches.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.offer_title ? `${item.offer_title}` : ""}
                            {item.buyer_email ? ` · ${item.buyer_email}` : ""} ·{" "}
                            {new Date(item.started_at).toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ) : null}

            {recordMode !== "link" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Sale date</Label>
                <Input
                  type="date"
                  value={soldAt}
                  onChange={(event) => setSoldAt(event.target.value)}
                />
              </div>
            ) : null}

            {recordMode === "link" && !matchesLoading && matches.length === 0 ? null : (
              <Button
                size="sm"
                disabled={busy || !canSubmitRecordSale}
                onClick={() => void onRecordSale()}
              >
                {recordSale.isPending ? "Saving…" : "Record sale"}
              </Button>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            You don’t have permission to record a sale.
          </p>
        )}
      </div>
    )
  } else {
    body = (
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">1. Sale linked</p>
          <dl className="space-y-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sale</dt>
              <dd className="font-medium text-foreground">#{lead.organization_sale_id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium capitalize text-foreground">
                {lead.sale_source ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Enrollment</dt>
              <dd className="font-medium text-foreground">
                {lead.enrollment_id != null ? `#${lead.enrollment_id}` : "None"}
              </dd>
            </div>
          </dl>

          {canRecordSale && !locked ? (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search by buyer email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={linkEmailInput}
                    onChange={(event) => setLinkEmailInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        applyLinkEmailLookup()
                      }
                    }}
                    placeholder="email@example.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={
                      matchesLoading ||
                      linkEmailInput.trim().toLowerCase() ===
                        linkEmailLookup.trim().toLowerCase()
                    }
                    onClick={applyLinkEmailLookup}
                  >
                    Search
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Change enrollment</Label>
                {matchesLoading ? (
                  <p className="text-xs text-muted-foreground">Looking up purchases…</p>
                ) : matches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No enrollments for {linkEmailLookup}.
                  </p>
                ) : (
                  <Select
                    value={selectedEnrollmentId || undefined}
                    onValueChange={async (value) => {
                      setSelectedEnrollmentId(value)
                      await recordSale.mutateAsync({
                        leadId: lead.id,
                        input: {
                          mode: "link",
                          enrollment_id: Number(value),
                          sold_at: soldAt,
                        },
                      })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select enrollment" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.offer_title ? `${item.offer_title}` : ""}
                          {item.buyer_email ? ` · ${item.buyer_email}` : ""} ·{" "}
                          {new Date(item.started_at).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-foreground">2. Activate commissions</p>
          {canActivateCommissions ? (
            <>
              <p className="text-xs text-muted-foreground">
                Preview splits, then lock sales / ambassador pay roles. BU Owner
                is settled monthly from Settings → Business units.
              </p>
              <Button
                size="sm"
                className="w-full"
                disabled={busy || activatedByMemberId == null}
                onClick={() => void onReviewActivate()}
              >
                {preview.isPending ? "Preparing…" : "Review & activate"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              You don’t have permission to activate commissions.
            </p>
          )}
        </div>
      </div>
    )
  }

  const previewDialog = (
    <Dialog
      open={previewOpen}
      onOpenChange={(open) => {
        setPreviewOpen(open)
        if (!open) {
          setPreviewResult(null)
          setPendingActivate(null)
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm commissions</DialogTitle>
          <DialogDescription>
            Review payouts before activating. Attributions will lock after confirm.
          </DialogDescription>
        </DialogHeader>

        {previewResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-medium tabular-nums">
                  {formatCents(previewResult.amountGrossCents)}
                </p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">Org margin</p>
                <p className="font-medium tabular-nums">
                  {formatCents(previewResult.marginCents)}
                </p>
              </div>
            </div>

            <ul className="space-y-2">
              {previewResult.lines.map((line) => (
                <li
                  key={`${line.attributionId}-${line.attributionType}`}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {line.memberName ?? `Member #${line.memberId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {line.slotLabel}
                        {line.calcMode === "of_residual" ? " · residual" : ""}
                        {" · "}
                        {formatRateOrFixed(line.rate, line.fixed)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCents(line.totalCents)}
                    </p>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {line.installments.map((part) => (
                      <li
                        key={part.index}
                        className="flex justify-between text-[11px] text-muted-foreground"
                      >
                        <span>
                          {line.installments.length > 1 ? `Part ${part.index}` : "Due"} ·{" "}
                          {formatDueAt(part.dueAt)}
                        </span>
                        <span className="tabular-nums">{formatCents(part.amountCents)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">Total commissions</span>
              <span className="font-medium tabular-nums">
                {formatCents(previewResult.commissionsTotalCents)}
              </span>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={activate.isPending}
            onClick={() => setPreviewOpen(false)}
          >
            Back
          </Button>
          <Button
            disabled={activate.isPending || previewResult == null || activatedByMemberId == null}
            onClick={() => void onConfirmActivate()}
          >
            {activate.isPending ? "Activating…" : "Confirm activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (embedded) {
    return (
      <>
        {body}
        {previewDialog}
      </>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sale & commissions
      </h4>
      <div className="space-y-3 rounded-lg border border-border p-3">{body}</div>
      {previewDialog}
    </div>
  )
}

export function formatCommissionCents(cents: number): string {
  return formatCents(cents)
}
