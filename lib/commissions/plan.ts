import { z } from "zod"

/**
 * Org-global commission plan (docs/04 — 2026-10-07).
 * Defaults = immediate payouts; Head = of_residual.
 * Overrides stored on organizations.commission_plan.
 */

export type CommissionCalcMode = "of_base" | "of_residual"

export type CommissionScheduleKind =
  /**
   * Legacy: N equal parts, first due at +1 month when delayMonths is 0.
   * Prefer `equal_front_loaded` + delayMonths.
   */
  | "equal_deferred"
  /** N equal parts; first due at +delayMonths, then +1 month each. */
  | "equal_front_loaded"
  /** Single payment at +delayMonths from anchor. */
  | "single_delayed"

export type AcquisitionSlot = "sales" | "ambassador" | "head"

export type AttributionTypeForPlan = "closer" | "setter" | "ambassador" | "business_unit"

export type SlotPlan = {
  calcMode: CommissionCalcMode
  schedule: CommissionScheduleKind
  /** Months until first due date (all schedules). */
  delayMonths: number
}

export const slotPlanSchema = z.object({
  calcMode: z.enum(["of_base", "of_residual"]),
  schedule: z.enum(["equal_deferred", "equal_front_loaded", "single_delayed"]),
  delayMonths: z.number().int().min(0).max(60),
})

export type AcquisitionBasis = "on_deal" | "on_payment"

export const orgCommissionPlanSchema = z.object({
  /** on_deal = % of pack/base once ; on_payment = % of each cash sale. */
  acquisitionBasis: z.enum(["on_deal", "on_payment"]).default("on_deal"),
  acquisition: z.object({
    sales: slotPlanSchema,
    ambassador: slotPlanSchema,
    head: slotPlanSchema,
  }),
  delivery: z.object({
    coach: slotPlanSchema,
  }),
})

export type OrgCommissionPlan = z.infer<typeof orgCommissionPlanSchema>

/** Hardcoded org defaults until / when Settings overrides. */
export const DEFAULT_ACQUISITION_PLAN: Record<AcquisitionSlot, SlotPlan> = {
  sales: { calcMode: "of_base", schedule: "single_delayed", delayMonths: 0 },
  ambassador: { calcMode: "of_base", schedule: "single_delayed", delayMonths: 0 },
  head: { calcMode: "of_residual", schedule: "single_delayed", delayMonths: 0 },
}

/** Coach delivery (assign trigger) — not used at CRM activate. */
export const DEFAULT_COACH_DELIVERY_PLAN: SlotPlan = {
  calcMode: "of_base",
  schedule: "single_delayed",
  delayMonths: 0,
}

export const DEFAULT_ORG_COMMISSION_PLAN: OrgCommissionPlan = {
  acquisitionBasis: "on_deal",
  acquisition: {
    sales: DEFAULT_ACQUISITION_PLAN.sales,
    ambassador: DEFAULT_ACQUISITION_PLAN.ambassador,
    head: DEFAULT_ACQUISITION_PLAN.head,
  },
  delivery: {
    coach: DEFAULT_COACH_DELIVERY_PLAN,
  },
}

/** Normalize legacy equal_deferred (+1 hardcodé) → equal_front_loaded + delayMonths. */
export function normalizeSlotPlan(plan: SlotPlan): SlotPlan {
  if (plan.schedule !== "equal_deferred") return plan
  return {
    ...plan,
    schedule: "equal_front_loaded",
    delayMonths: plan.delayMonths === 0 ? 1 : plan.delayMonths,
  }
}

export function normalizeOrgCommissionPlan(plan: OrgCommissionPlan): OrgCommissionPlan {
  return {
    ...plan,
    acquisition: {
      sales: normalizeSlotPlan(plan.acquisition.sales),
      ambassador: normalizeSlotPlan(plan.acquisition.ambassador),
      head: normalizeSlotPlan(plan.acquisition.head),
    },
    delivery: {
      coach: normalizeSlotPlan(plan.delivery.coach),
    },
  }
}

export function parseOrgCommissionPlan(value: unknown): OrgCommissionPlan {
  if (value == null) return DEFAULT_ORG_COMMISSION_PLAN
  const parsed = orgCommissionPlanSchema.safeParse(value)
  if (!parsed.success) return DEFAULT_ORG_COMMISSION_PLAN
  return normalizeOrgCommissionPlan(parsed.data)
}

/** Merge partial/unknown JSON with defaults (tolerant read). */
export function resolveOrgCommissionPlan(value: unknown): OrgCommissionPlan {
  const base = DEFAULT_ORG_COMMISSION_PLAN
  if (!value || typeof value !== "object" || Array.isArray(value)) return base
  const record = value as Record<string, unknown>
  const acquisition =
    record.acquisition && typeof record.acquisition === "object" && !Array.isArray(record.acquisition)
      ? (record.acquisition as Record<string, unknown>)
      : {}
  const delivery =
    record.delivery && typeof record.delivery === "object" && !Array.isArray(record.delivery)
      ? (record.delivery as Record<string, unknown>)
      : {}

  function slot(raw: unknown, fallback: SlotPlan): SlotPlan {
    const parsed = slotPlanSchema.safeParse(raw)
    return normalizeSlotPlan(parsed.success ? parsed.data : fallback)
  }

  const basisRaw = record.acquisitionBasis
  const acquisitionBasis: AcquisitionBasis =
    basisRaw === "on_payment" || basisRaw === "on_deal" ? basisRaw : base.acquisitionBasis

  return {
    acquisitionBasis,
    acquisition: {
      sales: slot(acquisition.sales, base.acquisition.sales),
      ambassador: slot(acquisition.ambassador, base.acquisition.ambassador),
      head: slot(acquisition.head, base.acquisition.head),
    },
    delivery: {
      coach: slot(delivery.coach, base.delivery.coach),
    },
  }
}

export function slotForAttributionType(type: AttributionTypeForPlan): AcquisitionSlot {
  if (type === "ambassador") return "ambassador"
  if (type === "business_unit") return "head"
  return "sales"
}

export function planForAttributionType(
  type: AttributionTypeForPlan,
  orgPlan?: OrgCommissionPlan | null
): SlotPlan {
  const plan = orgPlan ?? DEFAULT_ORG_COMMISSION_PLAN
  return plan.acquisition[slotForAttributionType(type)]
}

/** Add calendar months preserving day-of-month when possible (UTC date parts). */
export function addMonthsUtc(anchor: Date, months: number): Date {
  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth()
  const day = anchor.getUTCDate()
  const hours = anchor.getUTCHours()
  const minutes = anchor.getUTCMinutes()
  const seconds = anchor.getUTCSeconds()
  const ms = anchor.getUTCMilliseconds()

  const target = new Date(Date.UTC(year, month + months, 1, hours, minutes, seconds, ms))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target
}

/**
 * Months until the first due date for a schedule.
 * Legacy `equal_deferred` with delayMonths 0 = start at +1 month.
 */
export function scheduleStartOffsetMonths(
  schedule: CommissionScheduleKind,
  delayMonths: number
): number {
  const delay = Math.max(0, delayMonths)
  if (schedule === "equal_deferred" && delay === 0) return 1
  return delay
}

/**
 * Due dates for one commission total split into `installmentCount` parts.
 * Index 0 = first installment.
 * For equal schedules, first due = anchor + delayMonths, then +1 month each.
 */
export function dueDatesForSchedule(input: {
  schedule: CommissionScheduleKind
  installmentCount: number
  delayMonths: number
  anchor?: Date
}): Date[] {
  const anchor = input.anchor ?? new Date()
  const n = Math.max(1, input.installmentCount)
  const start = scheduleStartOffsetMonths(input.schedule, input.delayMonths)

  if (input.schedule === "single_delayed") {
    return [addMonthsUtc(anchor, start)]
  }

  // equal_front_loaded | equal_deferred (legacy)
  return Array.from({ length: n }, (_, i) => addMonthsUtc(anchor, start + i))
}

export function splitAmountAcrossInstallments(
  totalCents: number,
  installmentCount: number
): number[] {
  const count = Math.max(1, installmentCount)
  const base = Math.floor(totalCents / count)
  const parts = Array.from({ length: count }, () => base)
  let remainder = totalCents - base * count
  for (let i = count - 1; i >= 0 && remainder > 0; i -= 1) {
    parts[i] += 1
    remainder -= 1
  }
  return parts
}

export function computeCommissionTotalCents(input: {
  baseCents: number
  rate: number | null
  fixed: number | null
}): number {
  if (input.fixed != null && input.fixed > 0) {
    return Math.round(input.fixed)
  }
  if (input.rate != null && input.rate > 0) {
    return Math.round((input.baseCents * input.rate) / 100)
  }
  return 0
}
