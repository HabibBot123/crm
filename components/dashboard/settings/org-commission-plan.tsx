"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SectionCard } from "@/components/dashboard/section-card"
import { TableScroll } from "@/components/dashboard/table-scroll"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { cn } from "@/lib/utils"
import {
  DEFAULT_ORG_COMMISSION_PLAN,
  dueDatesForSchedule,
  type AcquisitionBasis,
  type AcquisitionSlot,
  type CommissionCalcMode,
  type CommissionScheduleKind,
  type OrgCommissionPlan,
  type SlotPlan,
} from "@/lib/commissions/plan"
import {
  useOrgCommissionPlan,
  useUpdateOrgCommissionPlan,
} from "@/hooks/use-commission-plan"

/** UI schedule options (equal_deferred is legacy, normalized on read). */
const SCHEDULE_KINDS_UI: Array<"single_delayed" | "equal_front_loaded"> = [
  "single_delayed",
  "equal_front_loaded",
]

/** Schedule = how one person's commission is paid over time (not a split between roles). */
const SCHEDULE_LABELS: Record<"single_delayed" | "equal_front_loaded", string> = {
  single_delayed: "One payment",
  equal_front_loaded: "Equal installments",
}

const SAMPLE_PACK_EUR = 10_000
const SAMPLE_INSTALLMENT_COUNT = 3
const SAMPLE_SALES_RATE = 10
const SAMPLE_AMBASSADOR_RATE = 5
const SAMPLE_HEAD_RATE = 5

type ExampleScenario = "one_shot" | "installments"

const EXAMPLE_SCENARIOS: Array<{ id: ExampleScenario; label: string }> = [
  { id: "one_shot", label: "One-shot" },
  { id: "installments", label: "Installments" },
]

const euro = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

const dueDateLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

function isScheduleKindUi(
  value: string
): value is "single_delayed" | "equal_front_loaded" {
  return value === "single_delayed" || value === "equal_front_loaded"
}

function scheduleSelectValue(
  schedule: CommissionScheduleKind
): "single_delayed" | "equal_front_loaded" {
  return schedule === "single_delayed" ? "single_delayed" : "equal_front_loaded"
}

function isCalcMode(value: string): value is CommissionCalcMode {
  return value === "of_base" || value === "of_residual"
}

function scenarioMeta(scenario: ExampleScenario): {
  context: string
  cashBaseEur: number
  scheduleParts: number
  amountScope: string
} {
  if (scenario === "installments") {
    return {
      context: `Pack ${euro.format(SAMPLE_PACK_EUR)} · ${SAMPLE_INSTALLMENT_COUNT} installments`,
      cashBaseEur: Math.round(SAMPLE_PACK_EUR / SAMPLE_INSTALLMENT_COUNT),
      scheduleParts: SAMPLE_INSTALLMENT_COUNT,
      amountScope: "per installment",
    }
  }
  return {
    context: `Pack ${euro.format(SAMPLE_PACK_EUR)} · paid once`,
    cashBaseEur: SAMPLE_PACK_EUR,
    scheduleParts: 1,
    amountScope: "on pack",
  }
}

function scheduleDueDates(
  plan: SlotPlan,
  anchor: Date,
  scheduleParts: number
): string[] {
  const installmentCount =
    plan.schedule === "single_delayed" ? 1 : Math.max(1, scheduleParts)
  return dueDatesForSchedule({
    schedule: plan.schedule,
    installmentCount,
    delayMonths: plan.delayMonths,
    anchor,
  }).map((d) => dueDateLabel.format(d))
}

function scheduleShortLabel(plan: SlotPlan): string {
  const kind = scheduleSelectValue(plan.schedule)
  const base = SCHEDULE_LABELS[kind]
  if (plan.delayMonths === 0) return `${base} (now)`
  return `${base} (+${plan.delayMonths} mo)`
}

function SettingsExample({ draft }: { draft: OrgCommissionPlan }) {
  const [scenario, setScenario] = useState<ExampleScenario>("one_shot")
  const meta = scenarioMeta(scenario)
  const calcBase =
    draft.acquisitionBasis === "on_deal" ? SAMPLE_PACK_EUR : meta.cashBaseEur
  const amountDetailSuffix =
    draft.acquisitionBasis === "on_deal" ? "of pack" : meta.amountScope

  const sales = Math.round((calcBase * SAMPLE_SALES_RATE) / 100)
  const amb = Math.round((calcBase * SAMPLE_AMBASSADOR_RATE) / 100)
  const residual = calcBase - sales - amb
  const headBase =
    draft.acquisition.head.calcMode === "of_residual" ? residual : calcBase
  const head = Math.round((headBase * SAMPLE_HEAD_RATE) / 100)
  const org = calcBase - sales - amb - head
  const headBaseLabel =
    draft.acquisition.head.calcMode === "of_residual"
      ? "Pack minus sales & ambassadors"
      : "On pack"
  const whenLabel =
    draft.acquisitionBasis === "on_deal"
      ? "Once per deal on pack amount"
      : "On each payment (cash sale)"

  const anchor = new Date()
  const amountRows = [
    {
      role: "Sales",
      detail: `${SAMPLE_SALES_RATE}% ${amountDetailSuffix}`,
      amount: sales,
    },
    {
      role: "Ambassador",
      detail: `${SAMPLE_AMBASSADOR_RATE}% ${amountDetailSuffix}`,
      amount: amb,
    },
    {
      role: "BU owner",
      detail: `${SAMPLE_HEAD_RATE}% · ${headBaseLabel}`,
      amount: head,
    },
    { role: "Org", detail: "Remainder", amount: org },
  ]
  const dueRows: Array<{ role: string; plan: SlotPlan }> = [
    { role: "Sales", plan: draft.acquisition.sales },
    { role: "Ambassador", plan: draft.acquisition.ambassador },
    { role: "Coach", plan: draft.delivery.coach },
    { role: "BU owner", plan: draft.acquisition.head },
  ]

  return (
    <SectionCard
      title="Example with your actual settings"
      subtitle={`CRM · ${whenLabel}. Sample rates.`}
      noPadding
    >
      <div className="space-y-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenario(item.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                scenario === item.id
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-foreground">{meta.context}</p>
      </div>
      <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div>
          <p className="border-b border-border bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Amounts
            {draft.acquisitionBasis === "on_payment" ? (
              <span className="ml-1 font-normal normal-case tracking-normal">
                ({meta.amountScope})
              </span>
            ) : null}
          </p>
          <table className="w-full text-left text-sm">
            <tbody>
              {amountRows.map((row) => (
                <tr key={row.role} className="hover:bg-accent/60">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.role}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{row.detail}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-foreground tabular-nums">
                    {euro.format(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="border-b border-border bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Due dates
          </p>
          <table className="w-full text-left text-sm">
            <tbody>
              {dueRows.map((row) => (
                <tr key={row.role} className="hover:bg-accent/60">
                  <td className="px-4 py-2.5 font-medium text-foreground">{row.role}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {scheduleShortLabel(row.plan)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                    {scheduleDueDates(
                      row.plan,
                      anchor,
                      meta.scheduleParts
                    ).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  )
}

function patchSlotPlan(plan: SlotPlan, next: Partial<SlotPlan>): SlotPlan {
  return {
    ...plan,
    ...next,
    schedule:
      next.schedule ??
      (plan.schedule === "single_delayed" ? "single_delayed" : "equal_front_loaded"),
  }
}

function ScheduleSelect({
  plan,
  disabled,
  onChange,
}: {
  plan: SlotPlan
  disabled?: boolean
  onChange: (next: SlotPlan) => void
}) {
  return (
    <Select
      value={scheduleSelectValue(plan.schedule)}
      disabled={disabled}
      onValueChange={(value) => {
        if (isScheduleKindUi(value)) onChange(patchSlotPlan(plan, { schedule: value }))
      }}
    >
      <SelectTrigger className="h-8 w-[11.5rem] shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCHEDULE_KINDS_UI.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {SCHEDULE_LABELS[kind]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DelayStepper({
  plan,
  disabled,
  onChange,
}: {
  plan: SlotPlan
  disabled?: boolean
  onChange: (next: SlotPlan) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-7 shrink-0"
        disabled={disabled || plan.delayMonths <= 0}
        aria-label="Decrease delay months"
        onClick={() =>
          onChange(patchSlotPlan(plan, { delayMonths: Math.max(0, plan.delayMonths - 1) }))
        }
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="min-w-[2.25rem] cursor-help rounded-sm px-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="text-sm font-medium tabular-nums leading-none text-foreground">
            {plan.delayMonths}
          </p>
          <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">mo</p>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem] text-xs">
          How many months to wait before the commission becomes due.
        </TooltipContent>
      </Tooltip>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-7 shrink-0"
        disabled={disabled || plan.delayMonths >= 60}
        aria-label="Increase delay months"
        onClick={() =>
          onChange(patchSlotPlan(plan, { delayMonths: Math.min(60, plan.delayMonths + 1) }))
        }
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function PlanTable({
  rows,
}: {
  rows: Array<{
    key: string
    role: string
    trigger: string
    base: ReactNode
    schedule: ReactNode
    delay: ReactNode
  }>
}) {
  return (
    <TableScroll>
      <table className="w-full min-w-[52rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trigger
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Base
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Schedule
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delay
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-accent/60">
              <td className="px-4 py-3 font-medium text-foreground">{row.role}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.trigger}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.base}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.schedule}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.delay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}

export function OrgCommissionPlanSettings({
  organizationId,
  canEdit,
}: {
  organizationId: number
  canEdit: boolean
}) {
  const { plan, isLoading } = useOrgCommissionPlan(organizationId)
  const update = useUpdateOrgCommissionPlan(organizationId)
  const [draft, setDraft] = useState<OrgCommissionPlan>(DEFAULT_ORG_COMMISSION_PLAN)

  useEffect(() => {
    if (plan) setDraft(plan)
  }, [plan])

  function patchAcquisition(slot: AcquisitionSlot, next: SlotPlan) {
    setDraft((prev) => ({
      ...prev,
      acquisition: { ...prev.acquisition, [slot]: next },
    }))
  }

  function patchCoach(next: SlotPlan) {
    setDraft((prev) => ({
      ...prev,
      delivery: { coach: next },
    }))
  }

  function selectAcquisitionBasis(basis: AcquisitionBasis) {
    if (!canEdit || update.isPending || draft.acquisitionBasis === basis) return
    const next = { ...draft, acquisitionBasis: basis }
    setDraft(next)
    update.mutate({
      plan: next,
      successMessage:
        basis === "on_deal"
          ? "Commissions are now calculated once per deal"
          : "Commissions are now calculated on each payment",
    })
  }

  if (isLoading) return <LoadingRows count={4} />

  const actions = canEdit ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={update.isPending}
        onClick={() => update.mutate({ plan: draft })}
      >
        {update.isPending ? "Saving…" : "Save plan"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={update.isPending}
        onClick={() => setDraft(DEFAULT_ORG_COMMISSION_PLAN)}
      >
        Reset to defaults
      </Button>
    </div>
  ) : (
    <p className="text-xs text-muted-foreground">
      You need org settings permission to edit the commission plan.
    </p>
  )

  return (
    <div className="space-y-4">
      <SectionCard
        title="When to calculate"
        subtitle="Applies as soon as you pick an option."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!canEdit || update.isPending}
            onClick={() => selectAcquisitionBasis("on_deal")}
            className={cn(
              "rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-60",
              draft.acquisitionBasis === "on_deal"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40"
            )}
          >
            <p className="text-sm font-semibold text-foreground">Once per deal</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              On pack / base amount when commissions are activated
            </p>
          </button>
          <button
            type="button"
            disabled={!canEdit || update.isPending}
            onClick={() => selectAcquisitionBasis("on_payment")}
            className={cn(
              "rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-60",
              draft.acquisitionBasis === "on_payment"
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40"
            )}
          >
            <p className="text-sm font-semibold text-foreground">On each payment</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              On each cash sale (installment or invoice)
            </p>
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Payouts"
        subtitle="Who gets paid, when lines are created, and how the amount is due over time. Save plan to apply."
        noPadding
        footer={actions}
      >
        <PlanTable
          rows={[
            {
              key: "sales",
              role: "Sales",
              trigger: "CRM",
              base: "Pack",
              schedule: (
                <ScheduleSelect
                  plan={draft.acquisition.sales}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("sales", next)}
                />
              ),
              delay: (
                <DelayStepper
                  plan={draft.acquisition.sales}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("sales", next)}
                />
              ),
            },
            {
              key: "ambassador",
              role: "Ambassador",
              trigger: "CRM",
              base: "Pack",
              schedule: (
                <ScheduleSelect
                  plan={draft.acquisition.ambassador}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("ambassador", next)}
                />
              ),
              delay: (
                <DelayStepper
                  plan={draft.acquisition.ambassador}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("ambassador", next)}
                />
              ),
            },
            {
              key: "coach",
              role: "Coach",
              trigger: "Coaching",
              base: "Pack",
              schedule: (
                <ScheduleSelect
                  plan={draft.delivery.coach}
                  disabled={!canEdit}
                  onChange={patchCoach}
                />
              ),
              delay: (
                <DelayStepper
                  plan={draft.delivery.coach}
                  disabled={!canEdit}
                  onChange={patchCoach}
                />
              ),
            },
            {
              key: "head",
              role: "BU owner",
              trigger: "CRM",
              base: (
                <Select
                  value={draft.acquisition.head.calcMode}
                  disabled={!canEdit}
                  onValueChange={(value) => {
                    if (isCalcMode(value)) {
                      patchAcquisition("head", {
                        ...draft.acquisition.head,
                        calcMode: value,
                      })
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-[13.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="of_base">Pack</SelectItem>
                    <SelectItem value="of_residual">
                      Pack minus sales & ambassadors
                    </SelectItem>
                  </SelectContent>
                </Select>
              ),
              schedule: (
                <ScheduleSelect
                  plan={draft.acquisition.head}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("head", next)}
                />
              ),
              delay: (
                <DelayStepper
                  plan={draft.acquisition.head}
                  disabled={!canEdit}
                  onChange={(next) => patchAcquisition("head", next)}
                />
              ),
            },
          ]}
        />
      </SectionCard>

      <SettingsExample draft={draft} />
    </div>
  )
}
