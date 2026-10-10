"use client"

import { useEffect, useMemo, useState } from "react"
import { CircleAlert } from "lucide-react"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { buildDeliveryCommissionPreview } from "@/lib/commissions/compute-delivery"
import type { CoachingEnrollmentProduct } from "@/lib/services/coaching"
import {
  useTeamMembersForAssign,
  type OrganizationMemberForSelect,
} from "@/hooks/use-coaching"
import { useOrgCommissionPlan } from "@/hooks/use-commission-plan"
import { useEnrollmentSaleForDelivery } from "@/hooks/use-enrollment-sale-for-delivery"
import { cn, formatAmountFromCents } from "@/lib/utils"

type PayMode = "rate" | "fixed"

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

function applyMemberDefaults(member: OrganizationMemberForSelect | null): {
  mode: PayMode
  rateInput: string
  fixedMajorInput: string
} {
  if (!member) {
    return { mode: "rate", rateInput: "", fixedMajorInput: "" }
  }
  const fixed = member.default_commission_fixed_coach
  const rate = member.default_commission_rate_coach
  if (fixed != null && fixed > 0) {
    return {
      mode: "fixed",
      rateInput: "",
      fixedMajorInput: centsToMajorString(fixed),
    }
  }
  if (rate != null && rate > 0) {
    return {
      mode: "rate",
      rateInput: String(rate),
      fixedMajorInput: "",
    }
  }
  return { mode: "rate", rateInput: "", fixedMajorInput: "" }
}

function formatDue(dueAt: string, delayMonths: number): string {
  if (delayMonths <= 0) return "Due immediately"
  return `Due ${new Date(dueAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`
}

export function AssignCoachDialog({
  open,
  onOpenChange,
  organizationId,
  pack,
  mode = "assign",
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number | null
  pack: CoachingEnrollmentProduct | null
  mode?: "assign" | "change"
  isPending?: boolean
  onConfirm: (input: {
    organizationMemberId: number
    rate: number | null
    fixed: number | null
  }) => void
}) {
  const isChange = mode === "change"
  const [coachId, setCoachId] = useState("")
  const [defaultsAppliedFor, setDefaultsAppliedFor] = useState<string | null>(null)
  const [payMode, setPayMode] = useState<PayMode>("rate")
  const [rateInput, setRateInput] = useState("")
  const [fixedMajorInput, setFixedMajorInput] = useState("")

  const enrollmentId = pack?.enrollment_id ?? null
  const { data: members, isLoading: membersLoading } = useTeamMembersForAssign({
    organizationId: open ? organizationId : null,
  })
  const { sale, isLoading: saleLoading } = useEnrollmentSaleForDelivery({
    organizationId,
    enrollmentId,
    enabled: open && enrollmentId != null,
  })
  const { plan: orgPlan, isLoading: planLoading } = useOrgCommissionPlan(
    open ? organizationId : null
  )

  useEffect(() => {
    if (!open) {
      setCoachId("")
      setDefaultsAppliedFor(null)
      setPayMode("rate")
      setRateInput("")
      setFixedMajorInput("")
    }
  }, [open])

  useEffect(() => {
    if (!open || !coachId || defaultsAppliedFor === coachId) return
    const member = members.find((m) => String(m.id) === coachId) ?? null
    if (!member) return
    const defaults = applyMemberDefaults(member)
    setPayMode(defaults.mode)
    setRateInput(defaults.rateInput)
    setFixedMajorInput(defaults.fixedMajorInput)
    setDefaultsAppliedFor(coachId)
  }, [open, coachId, members, defaultsAppliedFor])

  const rate =
    payMode === "rate"
      ? (() => {
          const n = Number(rateInput.trim().replace(",", "."))
          return Number.isFinite(n) && n > 0 ? n : null
        })()
      : null
  const fixed =
    payMode === "fixed" ? majorStringToCents(fixedMajorInput) : null

  const preview = useMemo(() => {
    if (sale == null) return null
    return buildDeliveryCommissionPreview({
      amountGrossCents: sale.priceCents,
      rate: payMode === "rate" ? rate : null,
      fixed: payMode === "fixed" ? fixed : null,
      orgPlan,
    })
  }, [sale, payMode, rate, fixed, orgPlan])

  const currency = sale?.currency ?? "eur"
  const hasSale = sale != null
  const coachSelected = coachId !== ""
  const canSubmit =
    coachSelected &&
    (!hasSale || (preview != null && preview.totalCents > 0)) &&
    !isPending &&
    !saleLoading

  const handleConfirm = () => {
    const memberId = Number(coachId)
    if (!Number.isFinite(memberId) || memberId <= 0) return
    if (hasSale && (preview == null || preview.totalCents <= 0)) return
    onConfirm({
      organizationMemberId: memberId,
      rate: hasSale && payMode === "rate" ? rate : null,
      fixed: hasSale && payMode === "fixed" ? fixed : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isChange ? "Change coach" : "Assign coach"}</DialogTitle>
          <DialogDescription>
            {pack
              ? `${pack.product_title} · ${pack.user_full_name}`
              : "Select a coach and review the delivery commission."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Coach</Label>
            <SearchSelect
              value={coachId}
              onValueChange={(value) => {
                setCoachId(value)
                setDefaultsAppliedFor(null)
              }}
              disabled={membersLoading || isPending}
              placeholder="Select coach…"
              searchPlaceholder="Search team…"
              emptyText="No team member found."
              options={members.map((m) => ({
                value: String(m.id),
                label: m.display_name
                  ? `${m.display_name} (${m.role})`
                  : `Member #${m.id} (${m.role})`,
              }))}
            />
          </div>

          {saleLoading || planLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : !hasSale ? (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                No sale on this pack —{" "}
                {isChange ? "changing" : "assigning"} a coach will not create a
                commission.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sale amount</span>
                <span className="font-medium text-foreground">
                  {formatAmountFromCents(sale.priceCents, currency) ?? "—"}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label>Commission</Label>
                <ToggleGroup
                  type="single"
                  value={payMode}
                  onValueChange={(value) => {
                    if (value === "rate" || value === "fixed") setPayMode(value)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <ToggleGroupItem value="rate" className="flex-1">
                    %
                  </ToggleGroupItem>
                  <ToggleGroupItem value="fixed" className="flex-1">
                    Fixed
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {payMode === "rate" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="coach-com-rate">Rate (%)</Label>
                  <Input
                    id="coach-com-rate"
                    inputMode="decimal"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="e.g. 10"
                    disabled={isPending}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="coach-com-fixed">Fixed amount</Label>
                  <Input
                    id="coach-com-fixed"
                    inputMode="decimal"
                    value={fixedMajorInput}
                    onChange={(e) => setFixedMajorInput(e.target.value)}
                    placeholder="e.g. 150.00"
                    disabled={isPending}
                  />
                </div>
              )}

              <div
                className={cn(
                  "rounded-md border border-border bg-background px-3 py-2 text-sm",
                  preview == null && "text-muted-foreground"
                )}
              >
                {preview == null ? (
                  <p>Enter a rate or fixed amount to preview.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Coach earns</span>
                      <span className="font-semibold text-foreground">
                        {formatAmountFromCents(preview.totalCents, currency) ?? "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDue(
                        preview.installments[0]?.dueAt ?? new Date().toISOString(),
                        preview.plan.delayMonths
                      )}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Prefills from the member's commissions.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSubmit}>
            {isPending
              ? isChange
                ? "Changing…"
                : "Assigning…"
              : isChange
                ? "Confirm change"
                : "Confirm assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
