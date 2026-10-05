import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  activateLeadCommissionsSchema,
  commissionSchema,
  commissionStatusSchema,
  type ActivateLeadCommissionsInput,
  type Commission,
  type CommissionStatus,
} from "@/schemas/crm.schema"

const leadForCommissionSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  email: z.string(),
  full_name: z.string(),
  status: z.string(),
  enrollment_id: z.number().nullable(),
  business_unit_id: z.number().nullable(),
  target_offer_id: z.number().nullable(),
  proposed_amount: z.number().nullable(),
  commissions_activated_at: z.string().nullable(),
  sale_source: z.enum(["platform", "manual"]).nullable(),
})

const attributionRowSchema = z.object({
  id: z.number(),
  member_id: z.number(),
  attribution_type: z.enum(["closer", "setter", "ambassador", "business_unit"]),
  commission_rate: z.number().nullable(),
  commission_fixed: z.number().nullable(),
})

const memberDefaultsSchema = z.object({
  id: z.number(),
  default_commission_rate_sales: z.number().nullable(),
  default_commission_fixed_sales: z.number().nullable(),
  default_commission_rate_ambassador: z.number().nullable(),
  default_commission_fixed_ambassador: z.number().nullable(),
  default_commission_rate_coach: z.number().nullable(),
  default_commission_fixed_coach: z.number().nullable(),
})

function memberDefaultsForAttributionType(
  member: z.infer<typeof memberDefaultsSchema>,
  attributionType: z.infer<typeof attributionRowSchema>["attribution_type"]
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

const businessUnitRowSchema = z.object({
  id: z.number(),
  owner_member_id: z.number().nullable(),
  default_commission_rate: z.number().nullable(),
  default_commission_fixed: z.number().nullable(),
})

function splitAmountAcrossInstallments(totalCents: number, installmentCount: number): number[] {
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

function computeTotalCommissionCents(input: {
  amountGrossCents: number
  rate: number | null
  fixed: number | null
}): number {
  if (input.fixed != null && input.fixed > 0) {
    // fixed stored as currency major units in attributions historically — treat as cents if >= 100? 
    // Existing UI says "fixed" without specifying. Offers use cents. We'll treat commission_fixed as major units * 100 if < amount, else cents.
    // Spec: keep consistent with rate on gross cents. Store fixed as cents in DB going forward.
    return Math.round(input.fixed)
  }
  if (input.rate != null && input.rate > 0) {
    return Math.round((input.amountGrossCents * input.rate) / 100)
  }
  return 0
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

async function resolveGrossAmountCents(
  supabase: SupabaseClient,
  input: {
    enrollmentId: number | null
    amountGrossCents?: number
    proposedAmount: number | null
    targetOfferId: number | null
  }
): Promise<{ amountGrossCents: number; offerId: number | null; installmentCount: number }> {
  if (input.amountGrossCents != null) {
    let installmentCount = 1
    let offerId = input.targetOfferId
    if (input.enrollmentId != null) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("offer_id")
        .eq("id", input.enrollmentId)
        .maybeSingle()
      const enrollmentRecord = asRecord(enrollment)
      const resolvedOfferId = readNumber(enrollmentRecord, "offer_id")
      if (resolvedOfferId != null) {
        offerId = resolvedOfferId
        const meta = await fetchOfferCommissionMeta(supabase, resolvedOfferId)
        installmentCount = meta.installmentCount
      }
    }
    return { amountGrossCents: input.amountGrossCents, offerId, installmentCount }
  }

  if (input.enrollmentId != null) {
    const { data: sale, error: saleError } = await supabase
      .from("organization_sales")
      .select("price, enrollment_id")
      .eq("enrollment_id", input.enrollmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (saleError) throw saleError

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("offer_id")
      .eq("id", input.enrollmentId)
      .single()
    if (enrollmentError) throw enrollmentError

    const offerId = readNumber(asRecord(enrollment), "offer_id")
    if (offerId == null) throw new Error("Enrollment has no offer.")
    const meta = await fetchOfferCommissionMeta(supabase, offerId)
    const salePrice = readNumber(asRecord(sale), "price")
    const amountGrossCents = salePrice ?? meta.price
    if (amountGrossCents == null || amountGrossCents <= 0) {
      throw new Error("Could not resolve pack price for this enrollment.")
    }
    return { amountGrossCents, offerId, installmentCount: meta.installmentCount }
  }

  if (input.proposedAmount != null && input.proposedAmount > 0) {
    const cents =
      input.proposedAmount < 1000
        ? Math.round(input.proposedAmount * 100)
        : Math.round(input.proposedAmount)
    return { amountGrossCents: cents, offerId: input.targetOfferId, installmentCount: 1 }
  }

  if (input.targetOfferId != null) {
    const meta = await fetchOfferCommissionMeta(supabase, input.targetOfferId)
    if (meta.price == null || meta.price <= 0) {
      throw new Error("Could not resolve pack price.")
    }
    return {
      amountGrossCents: meta.price,
      offerId: input.targetOfferId,
      installmentCount: meta.installmentCount,
    }
  }

  throw new Error("Missing pack price. Link an enrollment or provide amount.")
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

export async function activateLeadCommissions(
  supabase: SupabaseClient,
  rawInput: ActivateLeadCommissionsInput
): Promise<{ createdCount: number }> {
  const input = activateLeadCommissionsSchema.parse(rawInput)

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, organization_id, email, full_name, status, enrollment_id, business_unit_id, target_offer_id, proposed_amount, commissions_activated_at, sale_source"
    )
    .eq("id", input.lead_id)
    .single()
  if (leadError) throw leadError
  const lead = leadForCommissionSchema.parse(leadRow)

  await assertCanActivateCommissions(supabase, lead.organization_id)

  if (lead.status !== "converted") {
    throw new Error("Commissions can only be activated on converted leads.")
  }
  if (lead.commissions_activated_at) {
    throw new Error("Commissions are already activated for this lead. Cancel them first.")
  }

  const enrollmentId =
    input.sale_source === "platform"
      ? (input.enrollment_id ?? lead.enrollment_id)
      : null

  if (input.sale_source === "platform" && enrollmentId == null) {
    throw new Error("Link a platform enrollment before activating commissions.")
  }

  let manualSaleId: number | null = null
  let amountGrossCents: number
  let offerId: number | null
  let installmentCount: number

  if (input.sale_source === "manual") {
    if (input.amount_gross_cents == null) {
      throw new Error("Manual sale requires a pack price.")
    }
    installmentCount = input.installment_count ?? 1
    amountGrossCents = input.amount_gross_cents
    offerId = input.offer_id ?? lead.target_offer_id
    const packTitle = input.pack_title?.trim() || "Manual sale"
    const { data: manualSale, error: manualError } = await supabase
      .from("manual_sales")
      .insert({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        offer_id: offerId,
        pack_title: packTitle,
        amount_gross: amountGrossCents,
        currency: "eur",
        payment_method: input.payment_method ?? null,
        installment_count: installmentCount,
        created_by_member_id: input.activated_by_member_id,
      })
      .select("id")
      .single()
    if (manualError) throw manualError
    manualSaleId = Number(manualSale.id)
  } else {
    const resolved = await resolveGrossAmountCents(supabase, {
      enrollmentId,
      amountGrossCents: input.amount_gross_cents,
      proposedAmount: lead.proposed_amount,
      targetOfferId: lead.target_offer_id,
    })
    amountGrossCents = resolved.amountGrossCents
    offerId = resolved.offerId
    installmentCount = input.installment_count ?? resolved.installmentCount
  }

  // Ensure BU attribution before lock
  if (lead.business_unit_id != null) {
    const { data: buRow, error: buError } = await supabase
      .from("business_units")
      .select("id, owner_member_id, default_commission_rate, default_commission_fixed")
      .eq("id", lead.business_unit_id)
      .single()
    if (buError) throw buError
    const bu = businessUnitRowSchema.parse(buRow)
    if (bu.owner_member_id != null) {
      const { error: buAttrError } = await supabase.from("lead_attributions").upsert(
        {
          lead_id: lead.id,
          member_id: bu.owner_member_id,
          attribution_type: "business_unit",
          commission_rate: bu.default_commission_rate,
          commission_fixed: bu.default_commission_fixed,
        },
        { onConflict: "lead_id,member_id,attribution_type" }
      )
      if (buAttrError) throw buAttrError
    }
  }

  const { data: attributionRows, error: attrError } = await supabase
    .from("lead_attributions")
    .select("id, member_id, attribution_type, commission_rate, commission_fixed")
    .eq("lead_id", lead.id)
  if (attrError) throw attrError

  const attributions = z.array(attributionRowSchema).parse(attributionRows ?? [])
  if (attributions.length === 0) {
    throw new Error("Add at least one attribution (sales / ambassador / BU) before activating.")
  }

  // Fill null rates from member defaults by attribution type (before lock)
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
    const { error: updateAttrError } = await supabase
      .from("lead_attributions")
      .update({
        commission_rate: defaults.rate,
        commission_fixed: defaults.fixed,
      })
      .eq("id", attribution.id)
    if (updateAttrError) throw updateAttrError
    attribution.commission_rate = defaults.rate
    attribution.commission_fixed = defaults.fixed
  }

  const commissionInserts: Array<Record<string, unknown>> = []
  for (const attribution of attributions) {
    const totalCommission = computeTotalCommissionCents({
      amountGrossCents,
      rate: attribution.commission_rate,
      fixed: attribution.commission_fixed,
    })
    if (totalCommission <= 0) continue

    const commissionParts = splitAmountAcrossInstallments(totalCommission, installmentCount)
    const amountParts = splitAmountAcrossInstallments(amountGrossCents, installmentCount)

    for (let i = 0; i < installmentCount; i += 1) {
      commissionInserts.push({
        organization_id: lead.organization_id,
        lead_id: lead.id,
        enrollment_id: enrollmentId,
        manual_sale_id: manualSaleId,
        attribution_id: attribution.id,
        amount_paid: amountParts[i],
        commission_amount: commissionParts[i],
        status: "pending",
        pool: "acquisition",
        installment_index: i + 1,
        installment_count: installmentCount,
        business_unit_id: lead.business_unit_id,
      })
    }
  }

  if (commissionInserts.length === 0) {
    throw new Error("No commission amounts to create. Set rates on attributions or member defaults.")
  }

  const { error: insertError } = await supabase.from("commissions").insert(commissionInserts)
  if (insertError) throw insertError

  const { error: lockError } = await supabase
    .from("leads")
    .update({
      commissions_activated_at: new Date().toISOString(),
      commissions_activated_by: input.activated_by_member_id,
      sale_source: input.sale_source,
      enrollment_id: enrollmentId,
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

  const { error: cancelError } = await supabase
    .from("commissions")
    .update({ status: "canceled" })
    .eq("lead_id", leadId)
    .in("status", ["pending", "validated"])
  if (cancelError) throw cancelError

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
    memberId?: number
    page?: number
    pageSize?: number
  }
): Promise<CommissionsPage> {
  const page = Math.max(1, options?.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let attributionIdsForMember: number[] | null = null
  if (options?.memberId != null) {
    const { data: attributions, error: attributionsError } = await supabase
      .from("lead_attributions")
      .select("id")
      .eq("member_id", options.memberId)
    if (attributionsError) throw attributionsError
    attributionIdsForMember = (attributions ?? [])
      .map((row) => readNumber(asRecord(row), "id"))
      .filter((id): id is number => id != null)
    if (attributionIdsForMember.length === 0) {
      return { items: [], total: 0 }
    }
  }

  let query = supabase
    .from("commissions")
    .select(
      `
      id, organization_id, lead_id, enrollment_id, manual_sale_id, attribution_id,
      stripe_invoice_id, amount_paid, commission_amount, status, pool,
      installment_index, installment_count, business_unit_id,
      validated_by, validated_at, paid_at, paid_by, created_at
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .range(from, to)

  if (options?.status) {
    query = query.eq("status", commissionStatusSchema.parse(options.status))
  }
  if (attributionIdsForMember != null) {
    query = query.in("attribution_id", attributionIdsForMember)
  }

  const { data, error, count } = await query
  if (error) throw error

  const commissionRows = (data ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => row != null)
  const leadIds = Array.from(
    new Set(
      commissionRows
        .map((row) => readNumber(row, "lead_id"))
        .filter((id): id is number => id != null)
    )
  )
  const attributionIds = Array.from(
    new Set(
      commissionRows
        .map((row) => readNumber(row, "attribution_id"))
        .filter((id): id is number => id != null)
    )
  )

  const leadById = new Map<number, { full_name: string | null; email: string | null }>()
  if (leadIds.length > 0) {
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, full_name, email")
      .in("id", leadIds)
    if (leadsError) throw leadsError
    for (const lead of leads ?? []) {
      const record = asRecord(lead)
      const id = readNumber(record, "id")
      if (id == null) continue
      leadById.set(id, {
        full_name: readString(record, "full_name"),
        email: readString(record, "email"),
      })
    }
  }

  const attributionById = new Map<
    number,
    { member_id: number | null; attribution_type: Commission["attribution_type"] }
  >()
  if (attributionIds.length > 0) {
    const { data: attributions, error: attributionsError } = await supabase
      .from("lead_attributions")
      .select("id, member_id, attribution_type")
      .in("id", attributionIds)
    if (attributionsError) throw attributionsError
    for (const attribution of attributions ?? []) {
      const record = asRecord(attribution)
      const id = readNumber(record, "id")
      if (id == null) continue
      const attributionTypeRaw = readString(record, "attribution_type")
      const attributionType =
        attributionTypeRaw === "closer" ||
        attributionTypeRaw === "setter" ||
        attributionTypeRaw === "ambassador" ||
        attributionTypeRaw === "business_unit"
          ? attributionTypeRaw
          : null
      attributionById.set(id, {
        member_id: readNumber(record, "member_id"),
        attribution_type: attributionType,
      })
    }
  }

  const memberIds = Array.from(
    new Set(
      Array.from(attributionById.values())
        .map((item) => item.member_id)
        .filter((id): id is number => id != null)
    )
  )
  const memberNameById = new Map<number, string | null>()
  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("v_organization_members")
      .select("id, full_name")
      .in("id", memberIds)
    if (membersError) throw membersError
    for (const member of members ?? []) {
      const record = asRecord(member)
      const id = readNumber(record, "id")
      if (id == null) continue
      memberNameById.set(id, readString(record, "full_name"))
    }
  }

  const rows = commissionRows.map((row) => {
    const leadId = readNumber(row, "lead_id") ?? 0
    const attributionId = readNumber(row, "attribution_id") ?? 0
    const lead = leadById.get(leadId)
    const attribution = attributionById.get(attributionId)
    const memberId = attribution?.member_id ?? null
    const statusRaw = readString(row, "status") ?? "pending"
    const poolRaw = readString(row, "pool")

    return {
      id: readNumber(row, "id") ?? 0,
      organization_id: readNumber(row, "organization_id") ?? organizationId,
      lead_id: leadId,
      enrollment_id: readNumber(row, "enrollment_id"),
      manual_sale_id: readNumber(row, "manual_sale_id"),
      attribution_id: attributionId,
      stripe_invoice_id: readString(row, "stripe_invoice_id"),
      amount_paid: readNumber(row, "amount_paid") ?? 0,
      commission_amount: readNumber(row, "commission_amount") ?? 0,
      status: statusRaw,
      pool: poolRaw === "delivery" ? "delivery" : "acquisition",
      installment_index: readNumber(row, "installment_index") ?? 1,
      installment_count: readNumber(row, "installment_count") ?? 1,
      business_unit_id: readNumber(row, "business_unit_id"),
      validated_by: readNumber(row, "validated_by"),
      validated_at: readString(row, "validated_at"),
      paid_at: readString(row, "paid_at"),
      paid_by: readNumber(row, "paid_by"),
      created_at: readString(row, "created_at") ?? new Date().toISOString(),
      lead_name: lead?.full_name ?? null,
      lead_email: lead?.email ?? null,
      member_id: memberId,
      member_name: memberId != null ? (memberNameById.get(memberId) ?? null) : null,
      attribution_type: attribution?.attribution_type ?? null,
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
  let attributionIdsForMember: number[] | null = null
  if (options?.memberId != null) {
    const { data: attributions, error: attributionsError } = await supabase
      .from("lead_attributions")
      .select("id")
      .eq("member_id", options.memberId)
    if (attributionsError) throw attributionsError
    attributionIdsForMember = (attributions ?? [])
      .map((row) => readNumber(asRecord(row), "id"))
      .filter((id): id is number => id != null)
    if (attributionIdsForMember.length === 0) return 0
  }

  let query = supabase
    .from("commissions")
    .select("commission_amount")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "validated"])

  if (attributionIdsForMember != null) {
    query = query.in("attribution_id", attributionIdsForMember)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).reduce((sum, row) => {
    const amount = readNumber(asRecord(row), "commission_amount")
    return sum + (amount ?? 0)
  }, 0)
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
      validated_at: new Date().toISOString(),
      validated_by: input.paidByMemberId,
    })
    .in("id", input.commissionIds)
    .in("status", ["pending", "validated"])
  if (error) throw error
}
