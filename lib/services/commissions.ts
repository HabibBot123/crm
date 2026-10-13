import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  activateLeadCommissionsSchema,
  commissionMemberSummarySchema,
  commissionSchema,
  commissionStatusSchema,
  previewLeadCommissionsSchema,
  type ActivateLeadCommissionsInput,
  type Commission,
  type CommissionMemberSummary,
  type CommissionStatus,
  type PreviewLeadCommissionsInput,
} from "@/schemas/crm.schema"
import {
  attributionRowSchema,
  leadForCommissionSchema,
  memberDefaultsSchema,
  type AttributionRow,
  type LeadForCommission,
  type MemberDefaults,
} from "@/schemas/commission-compute.schema"
import { buildAcquisitionCommissionPreview } from "@/lib/commissions/compute-acquisition"
import type { AcquisitionPreviewResult } from "@/lib/commissions/compute-acquisition"
import { buildDeliveryCommissionPreview } from "@/lib/commissions/compute-delivery"
import { splitAmountAcrossInstallments } from "@/lib/commissions/plan"
import { fetchOrgCommissionPlan } from "@/lib/services/commission-plan"

function memberDefaultsForAttributionType(
  member: MemberDefaults,
  attributionType: AttributionRow["attribution_type"]
): { rate: number | null; fixed: number | null } {
  if (attributionType === "ambassador") {
    return {
      rate: member.default_commission_rate_ambassador,
      fixed: member.default_commission_fixed_ambassador,
    }
  }
  // closer / setter = sales defaults (business_unit uses BU defaults, skipped earlier)
  return {
    rate: member.default_commission_rate_sales,
    fixed: member.default_commission_fixed_sales,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null
  const value = record[key]
  return typeof value === "string" ? value : null
}

function readNumber(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export async function findEnrollmentsForLeadEmail(
  supabase: SupabaseClient,
  organizationId: number,
  email: string
): Promise<Array<{ id: number; offer_id: number; offer_title: string | null; buyer_email: string | null; started_at: string }>> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, offer_id, buyer_email, started_at")
    .eq("organization_id", organizationId)
    .ilike("buyer_email", normalized)
    .order("started_at", { ascending: false })
    .limit(20)

  if (error) throw error

  const offerIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => readNumber(asRecord(row), "offer_id"))
        .filter((id): id is number => id != null)
    )
  )
  const offerTitleById = new Map<number, string>()
  if (offerIds.length > 0) {
    const { data: offers, error: offersError } = await supabase
      .from("offers")
      .select("id, title")
      .in("id", offerIds)
    if (offersError) throw offersError
    for (const offer of offers ?? []) {
      const record = asRecord(offer)
      const id = readNumber(record, "id")
      const title = readString(record, "title")
      if (id != null && title != null) offerTitleById.set(id, title)
    }
  }

  return (data ?? []).map((row) => {
    const record = asRecord(row)
    const offerId = readNumber(record, "offer_id") ?? 0
    return {
      id: readNumber(record, "id") ?? 0,
      offer_id: offerId,
      offer_title: offerTitleById.get(offerId) ?? null,
      buyer_email: readString(record, "buyer_email"),
      started_at: readString(record, "started_at") ?? "",
    }
  })
}

export async function linkLeadEnrollment(
  supabase: SupabaseClient,
  input: { leadId: number; enrollmentId: number | null; saleSource?: "platform" | "manual" | null }
): Promise<void> {
  const patch: Record<string, unknown> = {
    enrollment_id: input.enrollmentId,
    updated_at: new Date().toISOString(),
  }
  if (input.saleSource !== undefined) {
    patch.sale_source = input.saleSource
  }
  const { error } = await supabase.from("leads").update(patch).eq("id", input.leadId)
  if (error) throw error
}

async function fetchOfferCommissionMeta(
  supabase: SupabaseClient,
  offerId: number
): Promise<{ price: number | null; installmentCount: number }> {
  const { data, error } = await supabase
    .from("offers")
    .select("id, price, commission_installment_count, installment_count")
    .eq("id", offerId)
    .maybeSingle()
  if (error) throw error
  const record = asRecord(data)
  const commissionCount = readNumber(record, "commission_installment_count")
  const offerInstallments = readNumber(record, "installment_count")
  const installmentCount =
    commissionCount != null && commissionCount >= 1
      ? commissionCount
      : offerInstallments != null && offerInstallments >= 1
        ? offerInstallments
        : 1
  return { price: readNumber(record, "price"), installmentCount }
}

function proposedAmountToCents(proposedAmount: number): number {
  return proposedAmount < 1000
    ? Math.round(proposedAmount * 100)
    : Math.round(proposedAmount)
}

async function resolveDealBaseAmountCents(
  supabase: SupabaseClient,
  input: {
    saleBaseAmountCents: number | null
    salePriceCents: number
    enrollmentId: number | null
    proposedAmount: number | null
    targetOfferId: number | null
  }
): Promise<{ amountGrossCents: number; offerId: number | null; scheduleInstallmentCount: number }> {
  let amountGrossCents = input.saleBaseAmountCents
  let offerId = input.targetOfferId
  let scheduleInstallmentCount = 1

  if (input.enrollmentId != null) {
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("offer_id, offer_variant_id")
      .eq("id", input.enrollmentId)
      .single()
    if (enrollmentError) throw enrollmentError

    const enrollmentRecord = asRecord(enrollment)
    const resolvedOfferId = readNumber(enrollmentRecord, "offer_id")
    const variantId = readNumber(enrollmentRecord, "offer_variant_id")

    if (variantId != null && (amountGrossCents == null || amountGrossCents <= 0)) {
      const { data: variant } = await supabase
        .from("offer_variants")
        .select("price, installment_count")
        .eq("id", variantId)
        .maybeSingle()
      const variantPrice = readNumber(asRecord(variant), "price")
      if (variantPrice != null && variantPrice > 0) amountGrossCents = variantPrice
    }

    if (resolvedOfferId != null) {
      offerId = resolvedOfferId
      const meta = await fetchOfferCommissionMeta(supabase, resolvedOfferId)
      scheduleInstallmentCount = meta.installmentCount
      if (amountGrossCents == null || amountGrossCents <= 0) {
        amountGrossCents = meta.price
      }
    }
  }

  if ((amountGrossCents == null || amountGrossCents <= 0) && input.proposedAmount != null && input.proposedAmount > 0) {
    amountGrossCents = proposedAmountToCents(input.proposedAmount)
  }

  if ((amountGrossCents == null || amountGrossCents <= 0) && input.targetOfferId != null) {
    const meta = await fetchOfferCommissionMeta(supabase, input.targetOfferId)
    offerId = input.targetOfferId
    scheduleInstallmentCount = meta.installmentCount
    amountGrossCents = meta.price
  }

  if (amountGrossCents == null || amountGrossCents <= 0) {
    amountGrossCents = input.salePriceCents
  }

  if (amountGrossCents <= 0) {
    throw new Error("Could not resolve deal base amount for commissions.")
  }

  return { amountGrossCents, offerId, scheduleInstallmentCount }
}

async function assertCanActivateCommissions(
  supabase: SupabaseClient,
  organizationId: number
): Promise<void> {
  const { data, error } = await supabase.rpc("has_org_capability", {
    p_organization_id: organizationId,
    p_capability: "crm.activate_commissions",
  })
  if (error) throw new Error("Failed to verify permissions.")
  if (data !== true) {
    throw new Error("You don't have permission to activate or cancel commissions.")
  }
}

/**
 * BU Owner payout is periodic settlement (not deal Activate / Stripe).
 * Clear legacy business_unit attributions on Activate persist.
 */
async function clearLegacyHeadAttributions(
  supabase: SupabaseClient,
  leadId: number,
  persist: boolean
): Promise<void> {
  if (!persist) return
  const { error } = await supabase
    .from("lead_attributions")
    .delete()
    .eq("lead_id", leadId)
    .eq("attribution_type", "business_unit")
  if (error) throw error
}

async function loadAttributionsWithDefaults(
  supabase: SupabaseClient,
  lead: LeadForCommission,
  options: { persist: boolean; offerId: number | null }
): Promise<{
  attributions: AttributionRow[]
  memberNames: Map<number, string | null>
  headBusinessUnitId: number | null
}> {
  void options.offerId
  await clearLegacyHeadAttributions(supabase, lead.id, options.persist)

  const { data: attributionRows, error: attrError } = await supabase
    .from("lead_attributions")
    .select("id, member_id, attribution_type, commission_rate, commission_fixed")
    .eq("lead_id", lead.id)
  if (attrError) throw attrError

  const attributions = z
    .array(attributionRowSchema)
    .parse(attributionRows ?? [])
    .filter((row) => row.attribution_type !== "business_unit")

  const filled = await fillAttributionDefaults(supabase, attributions, options)
  return { ...filled, headBusinessUnitId: null }
}

async function fillAttributionDefaults(
  supabase: SupabaseClient,
  attributions: AttributionRow[],
  options: { persist: boolean }
): Promise<{ attributions: AttributionRow[]; memberNames: Map<number, string | null> }> {
  if (attributions.length === 0) {
    throw new Error("Add at least one attribution (sales / ambassador) before activating.")
  }

  for (const attribution of attributions) {
    if (attribution.commission_rate != null || attribution.commission_fixed != null) continue
    if (attribution.attribution_type === "business_unit") continue
    const { data: memberRow, error: memberError } = await supabase
      .from("organization_members")
      .select(
        "id, default_commission_rate_sales, default_commission_fixed_sales, default_commission_rate_ambassador, default_commission_fixed_ambassador, default_commission_rate_coach, default_commission_fixed_coach"
      )
      .eq("id", attribution.member_id)
      .single()
    if (memberError) throw memberError
    const member = memberDefaultsSchema.parse(memberRow)
    const defaults = memberDefaultsForAttributionType(member, attribution.attribution_type)
    if (defaults.rate == null && defaults.fixed == null) continue
    if (options.persist && attribution.id > 0) {
      const { error: updateAttrError } = await supabase
        .from("lead_attributions")
        .update({
          commission_rate: defaults.rate,
          commission_fixed: defaults.fixed,
        })
        .eq("id", attribution.id)
      if (updateAttrError) throw updateAttrError
    }
    attribution.commission_rate = defaults.rate
    attribution.commission_fixed = defaults.fixed
  }

  const memberIds = Array.from(new Set(attributions.map((a) => a.member_id)))
  const memberNames = new Map<number, string | null>()
  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, profiles(full_name)")
      .in("id", memberIds)
    if (membersError) throw membersError
    for (const row of members ?? []) {
      const record = asRecord(row)
      if (!record) continue
      const id = readNumber(record, "id")
      if (id == null) continue
      const profiles = record.profiles
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      memberNames.set(id, readString(asRecord(profile), "full_name"))
    }
  }

  return { attributions, memberNames }
}

async function loadLeadForCommissions(
  supabase: SupabaseClient,
  leadId: number
): Promise<LeadForCommission> {
  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, organization_id, email, full_name, status, enrollment_id, organization_sale_id, business_unit_id, target_offer_id, proposed_amount, commissions_activated_at, sale_source"
    )
    .eq("id", leadId)
    .single()
  if (leadError) throw leadError
  return leadForCommissionSchema.parse(leadRow)
}

async function resolveDealFromSale(
  supabase: SupabaseClient,
  lead: LeadForCommission,
  input: {
    enrollment_id?: number | null
    installment_count?: number
  }
): Promise<{
  saleId: number
  enrollmentId: number | null
  amountGrossCents: number
  offerId: number | null
  installmentCount: number
  acquisitionBasis: "on_deal" | "on_payment"
}> {
  const saleId = lead.organization_sale_id
  if (saleId == null) {
    throw new Error("Record a sale before activating commissions.")
  }

  const { data: saleRow, error: saleError } = await supabase
    .from("organization_sales")
    .select("id, price, enrollment_id, base_amount_cents, installment_count")
    .eq("id", saleId)
    .eq("organization_id", lead.organization_id)
    .single()
  if (saleError) throw saleError
  const sale = asRecord(saleRow)
  const salePriceCents = readNumber(sale, "price")
  if (salePriceCents == null || salePriceCents <= 0) {
    throw new Error("Linked sale has no valid price.")
  }

  const enrollmentId =
    input.enrollment_id ?? lead.enrollment_id ?? readNumber(sale, "enrollment_id")

  const orgPlan = await fetchOrgCommissionPlan(supabase, lead.organization_id)
  const acquisitionBasis = orgPlan.acquisitionBasis

  if (acquisitionBasis === "on_payment") {
    let offerId = lead.target_offer_id
    if (enrollmentId != null) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("offer_id")
        .eq("id", enrollmentId)
        .maybeSingle()
      const resolvedOfferId = readNumber(asRecord(enrollment), "offer_id")
      if (resolvedOfferId != null) offerId = resolvedOfferId
    }
    return {
      saleId,
      enrollmentId,
      amountGrossCents: salePriceCents,
      offerId,
      installmentCount: 1,
      acquisitionBasis,
    }
  }

  const resolved = await resolveDealBaseAmountCents(supabase, {
    saleBaseAmountCents: readNumber(sale, "base_amount_cents"),
    salePriceCents,
    enrollmentId,
    proposedAmount: lead.proposed_amount,
    targetOfferId: lead.target_offer_id,
  })

  return {
    saleId,
    enrollmentId,
    amountGrossCents: resolved.amountGrossCents,
    offerId: resolved.offerId,
    installmentCount: input.installment_count ?? resolved.scheduleInstallmentCount,
    acquisitionBasis,
  }
}

/**
 * When org plan is on_payment and the lead is already activated,
 * create acquisition commissions for a newly inserted cash sale.
 */
export async function maybeCreateOnPaymentCommissionsForSale(
  supabase: SupabaseClient,
  saleId: number
): Promise<{ createdCount: number }> {
  const { data: saleRow, error: saleError } = await supabase
    .from("organization_sales")
    .select("id, organization_id, enrollment_id, price")
    .eq("id", saleId)
    .maybeSingle()
  if (saleError) throw saleError
  const sale = asRecord(saleRow)
  if (!sale) return { createdCount: 0 }

  const organizationId = readNumber(sale, "organization_id")
  const enrollmentId = readNumber(sale, "enrollment_id")
  const priceCents = readNumber(sale, "price")
  if (organizationId == null || priceCents == null || priceCents <= 0) {
    return { createdCount: 0 }
  }

  const orgPlan = await fetchOrgCommissionPlan(supabase, organizationId)
  if (orgPlan.acquisitionBasis !== "on_payment") {
    return { createdCount: 0 }
  }

  const { data: existing } = await supabase
    .from("commissions")
    .select("id")
    .eq("organization_sale_id", saleId)
    .eq("pool", "acquisition")
    .neq("status", "canceled")
    .limit(1)
  if (existing && existing.length > 0) return { createdCount: 0 }

  let leadQuery = supabase
    .from("leads")
    .select(
      "id, organization_id, email, full_name, status, enrollment_id, organization_sale_id, business_unit_id, target_offer_id, proposed_amount, commissions_activated_at, sale_source"
    )
    .eq("organization_id", organizationId)
    .eq("status", "converted")
    .not("commissions_activated_at", "is", null)

  if (enrollmentId != null) {
    leadQuery = leadQuery.eq("enrollment_id", enrollmentId)
  } else {
    leadQuery = leadQuery.eq("organization_sale_id", saleId)
  }

  const { data: leadRow, error: leadError } = await leadQuery.maybeSingle()
  if (leadError) throw leadError
  if (!leadRow) return { createdCount: 0 }

  const lead = leadForCommissionSchema.parse(leadRow)

  let offerId: number | null = lead.target_offer_id
  if (enrollmentId != null) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("offer_id")
      .eq("id", enrollmentId)
      .maybeSingle()
    const resolvedOfferId = readNumber(asRecord(enrollment), "offer_id")
    if (resolvedOfferId != null) offerId = resolvedOfferId
  }

  const { attributions, headBusinessUnitId } = await loadAttributionsWithDefaults(
    supabase,
    lead,
    { persist: false, offerId }
  )

  const preview = buildAcquisitionCommissionPreview({
    amountGrossCents: priceCents,
    installmentCount: 1,
    attributions,
    orgPlan,
  })

  const commissionInserts: Array<Record<string, unknown>> = []
  for (const line of preview.lines) {
    if (line.attributionId < 0) continue
    const partsCount = line.installments.length
    const amountParts = splitAmountAcrossInstallments(priceCents, partsCount)
    for (const installment of line.installments) {
      commissionInserts.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        enrollment_id: enrollmentId,
        organization_sale_id: saleId,
        attribution_id: line.attributionId,
        amount_paid: amountParts[installment.index - 1] ?? 0,
        commission_amount: installment.amountCents,
        status: "pending",
        pool: "acquisition",
        installment_index: installment.index,
        installment_count: partsCount,
        business_unit_id: headBusinessUnitId,
        due_at: installment.dueAt,
      })
    }
  }

  if (commissionInserts.length === 0) return { createdCount: 0 }

  const { error: insertError } = await supabase.from("commissions").insert(commissionInserts)
  if (insertError) throw insertError

  return { createdCount: commissionInserts.length }
}

export async function previewLeadCommissions(
  supabase: SupabaseClient,
  rawInput: PreviewLeadCommissionsInput
): Promise<AcquisitionPreviewResult> {
  const input = previewLeadCommissionsSchema.parse(rawInput)
  const lead = await loadLeadForCommissions(supabase, input.lead_id)
  await assertCanActivateCommissions(supabase, lead.organization_id)

  if (lead.status !== "converted") {
    throw new Error("Commissions can only be activated on converted leads.")
  }
  if (lead.commissions_activated_at) {
    throw new Error("Commissions are already activated for this lead. Cancel them first.")
  }

  const deal = await resolveDealFromSale(supabase, lead, input)
  if (deal.offerId == null) {
    throw new Error("Link this sale to an offer before activating commissions.")
  }
  const loaded = await loadAttributionsWithDefaults(supabase, lead, {
    persist: false,
    offerId: deal.offerId,
  })
  if (loaded.attributions.length === 0) {
    throw new Error("Add at least one attribution (sales / ambassador) before activating.")
  }
  const orgPlan = await fetchOrgCommissionPlan(supabase, lead.organization_id)

  const preview = buildAcquisitionCommissionPreview({
    amountGrossCents: deal.amountGrossCents,
    installmentCount: deal.installmentCount,
    attributions: loaded.attributions,
    memberNames: loaded.memberNames,
    orgPlan,
  })

  if (preview.lines.length === 0) {
    throw new Error("No commission amounts to create. Set rates on attributions or member defaults.")
  }

  return preview
}

export async function activateLeadCommissions(
  supabase: SupabaseClient,
  rawInput: ActivateLeadCommissionsInput
): Promise<{ createdCount: number }> {
  const input = activateLeadCommissionsSchema.parse(rawInput)
  const lead = await loadLeadForCommissions(supabase, input.lead_id)
  await assertCanActivateCommissions(supabase, lead.organization_id)

  if (lead.status !== "converted") {
    throw new Error("Commissions can only be activated on converted leads.")
  }
  if (lead.commissions_activated_at) {
    throw new Error("Commissions are already activated for this lead. Cancel them first.")
  }

  const deal = await resolveDealFromSale(supabase, lead, input)
  if (deal.offerId == null) {
    throw new Error("Link this sale to an offer before activating commissions.")
  }

  const loaded = await loadAttributionsWithDefaults(supabase, lead, {
    persist: true,
    offerId: deal.offerId,
  })

  if (loaded.attributions.length === 0) {
    throw new Error("Add at least one attribution (sales / ambassador) before activating.")
  }

  const orgPlan = await fetchOrgCommissionPlan(supabase, lead.organization_id)

  const preview = buildAcquisitionCommissionPreview({
    amountGrossCents: deal.amountGrossCents,
    installmentCount: deal.installmentCount,
    attributions: loaded.attributions,
    orgPlan,
  })

  const commissionInserts: Array<Record<string, unknown>> = []
  for (const line of preview.lines) {
    if (line.attributionId < 0) {
      throw new Error("Missing attribution. Retry activate.")
    }
    const partsCount = line.installments.length
    const amountParts = splitAmountAcrossInstallments(deal.amountGrossCents, partsCount)
    for (const installment of line.installments) {
      commissionInserts.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        enrollment_id: deal.enrollmentId,
        organization_sale_id: deal.saleId,
        attribution_id: line.attributionId,
        amount_paid: amountParts[installment.index - 1] ?? 0,
        commission_amount: installment.amountCents,
        status: "pending",
        pool: "acquisition",
        installment_index: installment.index,
        installment_count: partsCount,
        business_unit_id: null,
        due_at: installment.dueAt,
      })
    }
  }

  if (commissionInserts.length === 0) {
    throw new Error("No commission amounts to create. Set rates on attributions or member defaults.")
  }

  const { error: insertError } = await supabase.from("commissions").insert(commissionInserts)
  if (insertError) throw insertError

  const saleSource = lead.sale_source ?? input.sale_source
  const { error: lockError } = await supabase
    .from("leads")
    .update({
      commissions_activated_at: new Date().toISOString(),
      commissions_activated_by: input.activated_by_member_id,
      sale_source: saleSource,
      enrollment_id: deal.enrollmentId,
      organization_sale_id: deal.saleId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id)
  if (lockError) throw lockError

  return { createdCount: commissionInserts.length }
}

export async function cancelLeadCommissions(
  supabase: SupabaseClient,
  leadId: number
): Promise<void> {
  const { data: leadRow, error: leadLoadError } = await supabase
    .from("leads")
    .select("id, organization_id")
    .eq("id", leadId)
    .single()
  if (leadLoadError) throw leadLoadError
  if (!leadRow || typeof leadRow.organization_id !== "number") {
    throw new Error("Lead not found.")
  }

  await assertCanActivateCommissions(supabase, leadRow.organization_id)

  const { data: paidRows, error: paidError } = await supabase
    .from("commissions")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "paid")
    .limit(1)
  if (paidError) throw paidError
  if (paidRows && paidRows.length > 0) {
    throw new Error("Cannot cancel: some commissions are already marked paid.")
  }

  const { error: deleteError } = await supabase
    .from("commissions")
    .delete()
    .eq("lead_id", leadId)
    .eq("status", "pending")
  if (deleteError) throw deleteError

  const { data: unlocked, error: unlockError } = await supabase
    .from("leads")
    .update({
      commissions_activated_at: null,
      commissions_activated_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("id")
  if (unlockError) throw unlockError
  if (!unlocked || unlocked.length === 0) {
    throw new Error("You don't have permission to cancel commissions on this lead.")
  }
}

export type CommissionsPage = {
  items: Commission[]
  total: number
}

export async function fetchCommissions(
  supabase: SupabaseClient,
  organizationId: number,
  options?: {
    status?: CommissionStatus
    statuses?: CommissionStatus[]
    memberId?: number
    organizationSaleId?: number
    page?: number
    pageSize?: number
    search?: string
    attributionTypes?: Array<
      "closer" | "setter" | "ambassador" | "business_unit" | "coach"
    >
    amountMinCents?: number
    amountMaxCents?: number
    dueFrom?: string
    dueTo?: string
    /** Pending rows with due_at in the past (derived, not a DB status). */
    overdueOnly?: boolean
  }
): Promise<CommissionsPage> {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = options?.search?.trim() ?? ""

  let query = supabase
    .from("v_commissions")
    .select(
      `
      id, organization_id, lead_id, enrollment_id, organization_sale_id, attribution_id, beneficiary_member_id,
      stripe_invoice_id, amount_paid, commission_amount, status, pool,
      installment_index, installment_count, business_unit_id, due_at,
      paid_at, paid_by, created_at,
      lead_name, lead_email, member_id, member_name, attribution_type
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (options?.overdueOnly) {
    query = query
      .eq("status", "pending")
      .not("due_at", "is", null)
      .lt("due_at", new Date().toISOString())
  } else {
    const statuses =
      options?.statuses && options.statuses.length > 0
        ? options.statuses.map((status) => commissionStatusSchema.parse(status))
        : options?.status
          ? [commissionStatusSchema.parse(options.status)]
          : null
    if (statuses != null) {
      query = query.in("status", statuses)
    }
  }
  if (options?.memberId != null) {
    query = query.eq("member_id", options.memberId)
  }
  if (options?.organizationSaleId != null) {
    query = query.eq("organization_sale_id", options.organizationSaleId)
  }
  if (options?.attributionTypes && options.attributionTypes.length > 0) {
    query = query.in("attribution_type", options.attributionTypes)
  }
  if (options?.amountMinCents != null) {
    query = query.gte("commission_amount", options.amountMinCents)
  }
  if (options?.amountMaxCents != null) {
    query = query.lte("commission_amount", options.amountMaxCents)
  }
  if (options?.dueFrom) {
    query = query.gte("due_at", `${options.dueFrom}T00:00:00.000Z`)
  }
  if (options?.dueTo) {
    query = query.lte("due_at", `${options.dueTo}T23:59:59.999Z`)
  }
  if (search.length > 0) {
    const pattern = `%${search}%`
    query = query.or(
      `lead_name.ilike.${pattern},lead_email.ilike.${pattern},member_name.ilike.${pattern}`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const record = asRecord(row)
    const poolRaw = readString(record, "pool")
    const isDelivery = poolRaw === "delivery"
    const attributionTypeRaw = readString(record, "attribution_type")
    const attributionType =
      attributionTypeRaw === "closer" ||
      attributionTypeRaw === "setter" ||
      attributionTypeRaw === "ambassador" ||
      attributionTypeRaw === "business_unit" ||
      attributionTypeRaw === "coach"
        ? attributionTypeRaw
        : null
    const statusRaw = readString(record, "status") ?? "pending"

    return {
      id: readNumber(record, "id") ?? 0,
      organization_id: readNumber(record, "organization_id") ?? organizationId,
      lead_id: readNumber(record, "lead_id"),
      enrollment_id: readNumber(record, "enrollment_id"),
      organization_sale_id: readNumber(record, "organization_sale_id"),
      attribution_id: readNumber(record, "attribution_id"),
      beneficiary_member_id: readNumber(record, "beneficiary_member_id"),
      stripe_invoice_id: readString(record, "stripe_invoice_id"),
      amount_paid: readNumber(record, "amount_paid") ?? 0,
      commission_amount: readNumber(record, "commission_amount") ?? 0,
      status: statusRaw,
      pool: isDelivery ? "delivery" : "acquisition",
      installment_index: readNumber(record, "installment_index") ?? 1,
      installment_count: readNumber(record, "installment_count") ?? 1,
      business_unit_id: readNumber(record, "business_unit_id"),
      due_at: readString(record, "due_at"),
      paid_at: readString(record, "paid_at"),
      paid_by: readNumber(record, "paid_by"),
      created_at: readString(record, "created_at") ?? new Date().toISOString(),
      lead_name: readString(record, "lead_name"),
      lead_email: readString(record, "lead_email"),
      member_id: readNumber(record, "member_id"),
      member_name: readString(record, "member_name"),
      attribution_type: attributionType,
      offer_title: null,
    }
  })

  return {
    items: z.array(commissionSchema).parse(rows),
    total: count ?? 0,
  }
}

export async function fetchCommissionsDueTotalCents(
  supabase: SupabaseClient,
  organizationId: number,
  options?: { memberId?: number }
): Promise<number> {
  let attributionIdsForMember: number[] = []
  if (options?.memberId != null) {
    const { data: attributions, error: attributionsError } = await supabase
      .from("lead_attributions")
      .select("id")
      .eq("member_id", options.memberId)
    if (attributionsError) throw attributionsError
    attributionIdsForMember = (attributions ?? [])
      .map((row) => readNumber(asRecord(row), "id"))
      .filter((id): id is number => id != null)
  }

  let query = supabase
    .from("commissions")
    .select("commission_amount")
    .eq("organization_id", organizationId)
    .eq("status", "pending")

  if (options?.memberId != null) {
    const memberId = options.memberId
    if (attributionIdsForMember.length > 0) {
      query = query.or(
        `beneficiary_member_id.eq.${memberId},attribution_id.in.(${attributionIdsForMember.join(",")})`
      )
    } else {
      query = query.eq("beneficiary_member_id", memberId)
    }
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).reduce((sum, row) => {
    const amount = readNumber(asRecord(row), "commission_amount")
    return sum + (amount ?? 0)
  }, 0)
}

export type EnrollmentSaleForDelivery = {
  saleId: number
  priceCents: number
  currency: string
}

/** Latest sale for an enrollment (delivery commissions). Null if none / invalid price. */
export async function fetchEnrollmentSaleForDelivery(
  supabase: SupabaseClient,
  organizationId: number,
  enrollmentId: number
): Promise<EnrollmentSaleForDelivery | null> {
  const { data: enrollmentRow, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (enrollmentError) throw enrollmentError
  if (enrollmentRow == null) return null

  const { data: saleRow, error: saleError } = await supabase
    .from("organization_sales")
    .select("id, price, currency")
    .eq("enrollment_id", enrollmentId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (saleError) throw saleError
  const saleId = readNumber(asRecord(saleRow), "id")
  const priceCents = readNumber(asRecord(saleRow), "price")
  const currency = readString(asRecord(saleRow), "currency") ?? "eur"
  if (saleId == null || priceCents == null || priceCents <= 0) return null
  return { saleId, priceCents, currency }
}

/**
 * Create / replace pending delivery commissions when a coach is assigned.
 * No-op for solo orgs, missing sale, or when rate/fixed yields 0.
 * Optional rate/fixed override this assign only (defaults from member otherwise).
 */
export async function syncDeliveryCommissionOnAssign(
  supabase: SupabaseClient,
  input: {
    organizationId: number
    enrollmentProductId: number
    coachMemberId: number
    rate?: number | null
    fixed?: number | null
  }
): Promise<{ createdCount: number }> {
  const { data: orgRow, error: orgError } = await supabase
    .from("organizations")
    .select("id, mode")
    .eq("id", input.organizationId)
    .maybeSingle()
  if (orgError) throw orgError
  if (readString(asRecord(orgRow), "mode") === "solo") {
    return { createdCount: 0 }
  }

  const { data: epRow, error: epError } = await supabase
    .from("enrollment_products")
    .select("id, enrollment_id")
    .eq("id", input.enrollmentProductId)
    .maybeSingle()
  if (epError) throw epError
  const enrollmentId = readNumber(asRecord(epRow), "enrollment_id")
  if (enrollmentId == null) {
    throw new Error("Enrollment product has no enrollment.")
  }

  const sale = await fetchEnrollmentSaleForDelivery(
    supabase,
    input.organizationId,
    enrollmentId
  )
  // Delivery commissions require a real sale — never invent amount from offer price.
  if (sale == null) {
    return { createdCount: 0 }
  }
  const amountGrossCents = sale.priceCents
  const organizationSaleId = sale.saleId

  let rate = input.rate ?? null
  let fixed = input.fixed ?? null
  if (input.rate === undefined && input.fixed === undefined) {
    const { data: memberRow, error: memberError } = await supabase
      .from("organization_members")
      .select("id, default_commission_rate_coach, default_commission_fixed_coach")
      .eq("id", input.coachMemberId)
      .eq("organization_id", input.organizationId)
      .single()
    if (memberError) throw memberError
    const member = asRecord(memberRow)
    rate = readNumber(member, "default_commission_rate_coach")
    fixed = readNumber(member, "default_commission_fixed_coach")
  }

  const orgPlan = await fetchOrgCommissionPlan(supabase, input.organizationId)
  const preview = buildDeliveryCommissionPreview({
    amountGrossCents,
    rate,
    fixed,
    orgPlan,
  })
  if (!preview) return { createdCount: 0 }

  const { data: leadRow } = await supabase
    .from("leads")
    .select("id, business_unit_id")
    .eq("organization_id", input.organizationId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle()
  const leadId = readNumber(asRecord(leadRow), "id")
  const businessUnitId = readNumber(asRecord(leadRow), "business_unit_id")

  // Replace unpaid delivery lines for this enrollment + coach slot.
  const { error: deleteError } = await supabase
    .from("commissions")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("enrollment_id", enrollmentId)
    .eq("pool", "delivery")
    .eq("status", "pending")
  if (deleteError) throw deleteError

  const inserts = preview.installments.map((part) => ({
    organization_id: input.organizationId,
    lead_id: leadId,
    enrollment_id: enrollmentId,
    organization_sale_id: organizationSaleId,
    attribution_id: null,
    beneficiary_member_id: input.coachMemberId,
    amount_paid: amountGrossCents,
    commission_amount: part.amountCents,
    status: "pending",
    pool: "delivery",
    installment_index: part.index,
    installment_count: preview.installments.length,
    business_unit_id: businessUnitId,
    due_at: part.dueAt,
  }))

  const { error: insertError } = await supabase.from("commissions").insert(inserts)
  if (insertError) throw insertError

  return { createdCount: inserts.length }
}

export async function markCommissionsPaid(
  supabase: SupabaseClient,
  input: { commissionIds: number[]; paidByMemberId: number }
): Promise<void> {
  if (input.commissionIds.length === 0) return
  const { error } = await supabase
    .from("commissions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: input.paidByMemberId,
    })
    .in("id", input.commissionIds)
    .eq("status", "pending")
  if (error) throw error
}

export async function markCommissionsUnpaid(
  supabase: SupabaseClient,
  input: { commissionIds: number[] }
): Promise<void> {
  if (input.commissionIds.length === 0) return
  const { error } = await supabase
    .from("commissions")
    .update({
      status: "pending",
      paid_at: null,
      paid_by: null,
    })
    .in("id", input.commissionIds)
    .eq("status", "paid")
  if (error) throw error
}

export type CommissionMemberSummaryFilters = {
  search?: string
  statuses?: CommissionStatus[]
  overdueOnly?: boolean
  attributionTypes?: Array<
    "closer" | "setter" | "ambassador" | "business_unit" | "coach"
  >
  amountMinCents?: number
  amountMaxCents?: number
  dueFrom?: string
  dueTo?: string
  memberId?: number
}

function parseIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((id: unknown) => (typeof id === "number" ? id : Number(id)))
    .filter((id: number) => Number.isFinite(id))
}

export async function fetchCommissionsSummaryByMember(
  supabase: SupabaseClient,
  organizationId: number,
  options?: CommissionMemberSummaryFilters
): Promise<CommissionMemberSummary[]> {
  const { data, error } = await supabase.rpc("commissions_summary_by_member", {
    p_organization_id: organizationId,
    p_search: options?.search?.trim() || null,
    p_statuses:
      options?.statuses && options.statuses.length > 0 ? options.statuses : null,
    p_attribution_types:
      options?.attributionTypes && options.attributionTypes.length > 0
        ? options.attributionTypes
        : null,
    p_amount_min_cents: options?.amountMinCents ?? null,
    p_amount_max_cents: options?.amountMaxCents ?? null,
    p_due_from: options?.dueFrom ? `${options.dueFrom}T00:00:00.000Z` : null,
    p_due_to: options?.dueTo ? `${options.dueTo}T23:59:59.999Z` : null,
    p_member_id: options?.memberId ?? null,
    p_overdue_only: options?.overdueOnly === true,
  })
  if (error) throw error

  return z.array(commissionMemberSummarySchema).parse(
    (data ?? []).map((row: unknown) => {
      const record = asRecord(row)
      return {
        member_id: readNumber(record, "member_id") ?? 0,
        member_name: readString(record, "member_name"),
        pending_count: Number(readNumber(record, "pending_count") ?? 0),
        pending_cents: Number(readNumber(record, "pending_cents") ?? 0),
        overdue_count: Number(readNumber(record, "overdue_count") ?? 0),
        overdue_cents: Number(readNumber(record, "overdue_cents") ?? 0),
        pending_ids: parseIdArray(record?.pending_ids ?? []),
        overdue_ids: parseIdArray(record?.overdue_ids ?? []),
      }
    })
  )
}
