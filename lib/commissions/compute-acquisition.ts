import {
  computeCommissionTotalCents,
  dueDatesForSchedule,
  planForAttributionType,
  slotForAttributionType,
  splitAmountAcrossInstallments,
  type AttributionTypeForPlan,
  type CommissionCalcMode,
  type OrgCommissionPlan,
} from "@/lib/commissions/plan"

export type AcquisitionAttributionInput = {
  id: number
  member_id: number
  attribution_type: AttributionTypeForPlan
  commission_rate: number | null
  commission_fixed: number | null
}

export type AcquisitionPreviewInstallment = {
  index: number
  amountCents: number
  dueAt: string
}

export type AcquisitionPreviewLine = {
  attributionId: number
  memberId: number
  memberName: string | null
  attributionType: AttributionTypeForPlan
  slotLabel: string
  calcMode: CommissionCalcMode
  rate: number | null
  fixed: number | null
  totalCents: number
  installments: AcquisitionPreviewInstallment[]
}

export type AcquisitionPreviewResult = {
  amountGrossCents: number
  teamTotalCents: number
  residualBaseCents: number
  commissionsTotalCents: number
  marginCents: number
  lines: AcquisitionPreviewLine[]
}

const SLOT_LABELS: Record<string, string> = {
  sales: "Sales",
  ambassador: "Ambassador",
  head: "Head",
}

export function buildAcquisitionCommissionPreview(input: {
  amountGrossCents: number
  installmentCount: number
  attributions: AcquisitionAttributionInput[]
  memberNames?: ReadonlyMap<number, string | null>
  anchor?: Date
  orgPlan?: OrgCommissionPlan | null
}): AcquisitionPreviewResult {
  const anchor = input.anchor ?? new Date()
  const orgPlan = input.orgPlan ?? null
  const ofBase = input.attributions.filter(
    (a) => planForAttributionType(a.attribution_type, orgPlan).calcMode === "of_base"
  )
  const ofResidual = input.attributions.filter(
    (a) => planForAttributionType(a.attribution_type, orgPlan).calcMode === "of_residual"
  )

  type Internal = {
    attribution: AcquisitionAttributionInput
    totalCents: number
  }

  const computed: Internal[] = []

  for (const attribution of ofBase) {
    const totalCents = computeCommissionTotalCents({
      baseCents: input.amountGrossCents,
      rate: attribution.commission_rate,
      fixed: attribution.commission_fixed,
    })
    if (totalCents <= 0) continue
    computed.push({ attribution, totalCents })
  }

  const teamTotalCents = computed.reduce((sum, line) => sum + line.totalCents, 0)
  const residualBaseCents = Math.max(0, input.amountGrossCents - teamTotalCents)

  for (const attribution of ofResidual) {
    const totalCents = computeCommissionTotalCents({
      baseCents: residualBaseCents,
      rate: attribution.commission_rate,
      fixed: attribution.commission_fixed,
    })
    if (totalCents <= 0) continue
    computed.push({ attribution, totalCents })
  }

  const lines: AcquisitionPreviewLine[] = computed.map(({ attribution, totalCents }) => {
    const plan = planForAttributionType(attribution.attribution_type, orgPlan)
    const slot = slotForAttributionType(attribution.attribution_type)
    const partsCount =
      plan.schedule === "single_delayed" ? 1 : Math.max(1, input.installmentCount)
    const parts = splitAmountAcrossInstallments(totalCents, partsCount)
    const dueDates = dueDatesForSchedule({
      schedule: plan.schedule,
      installmentCount: partsCount,
      delayMonths: plan.delayMonths,
      anchor,
    })

    return {
      attributionId: attribution.id,
      memberId: attribution.member_id,
      memberName: input.memberNames?.get(attribution.member_id) ?? null,
      attributionType: attribution.attribution_type,
      slotLabel: SLOT_LABELS[slot] ?? slot,
      calcMode: plan.calcMode,
      rate: attribution.commission_rate,
      fixed: attribution.commission_fixed,
      totalCents,
      installments: parts.map((amountCents, i) => ({
        index: i + 1,
        amountCents,
        dueAt: dueDates[i]?.toISOString() ?? anchor.toISOString(),
      })),
    }
  })

  const commissionsTotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0)

  return {
    amountGrossCents: input.amountGrossCents,
    teamTotalCents,
    residualBaseCents,
    commissionsTotalCents,
    marginCents: Math.max(0, input.amountGrossCents - commissionsTotalCents),
    lines,
  }
}
