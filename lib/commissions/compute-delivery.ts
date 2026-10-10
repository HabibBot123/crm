import {
  computeCommissionTotalCents,
  dueDatesForSchedule,
  splitAmountAcrossInstallments,
  type OrgCommissionPlan,
  type SlotPlan,
  DEFAULT_COACH_DELIVERY_PLAN,
} from "@/lib/commissions/plan"

export type DeliveryPreviewInstallment = {
  index: number
  amountCents: number
  dueAt: string
}

export type DeliveryCommissionPreview = {
  totalCents: number
  installments: DeliveryPreviewInstallment[]
  plan: SlotPlan
}

export function buildDeliveryCommissionPreview(input: {
  amountGrossCents: number
  rate: number | null
  fixed: number | null
  orgPlan?: OrgCommissionPlan | null
  anchor?: Date
}): DeliveryCommissionPreview | null {
  const plan = input.orgPlan?.delivery.coach ?? DEFAULT_COACH_DELIVERY_PLAN
  const totalCents = computeCommissionTotalCents({
    baseCents: input.amountGrossCents,
    rate: input.rate,
    fixed: input.fixed,
  })
  if (totalCents <= 0) return null

  const anchor = input.anchor ?? new Date()
  // Delivery V1: one installment; schedule kind + delayMonths drive due_at.
  const n = 1
  const parts = splitAmountAcrossInstallments(totalCents, n)
  const dueDates = dueDatesForSchedule({
    schedule: plan.schedule,
    installmentCount: n,
    delayMonths: plan.delayMonths,
    anchor,
  })

  return {
    totalCents,
    plan,
    installments: parts.map((amountCents, i) => ({
      index: i + 1,
      amountCents,
      dueAt: dueDates[i]?.toISOString() ?? anchor.toISOString(),
    })),
  }
}
