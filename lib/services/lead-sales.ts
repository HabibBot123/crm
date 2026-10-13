import type { SupabaseClient } from "@supabase/supabase-js"
import { createManualEnrollment } from "@/lib/services/enrollments"
import { recordLeadSaleSchema, type RecordLeadSaleInput } from "@/schemas/crm.schema"
import {
  enrollmentLinkSchema,
  leadSaleRowSchema,
} from "@/schemas/lead-sales.schema"

export type RecordLeadSaleResult = {
  enrollmentId: number | null
  saleId: number
  saleSource: "platform" | "manual"
}

async function linkLeadToSale(
  supabase: SupabaseClient,
  leadId: number,
  patch: {
    organization_sale_id: number
    enrollment_id?: number | null
    sale_source: "platform" | "manual"
    target_offer_id?: number | null
  }
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({
      organization_sale_id: patch.organization_sale_id,
      ...(patch.enrollment_id !== undefined ? { enrollment_id: patch.enrollment_id } : {}),
      ...(patch.target_offer_id !== undefined
        ? { target_offer_id: patch.target_offer_id }
        : {}),
      sale_source: patch.sale_source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
  if (error) throw new Error(error.message)
}

/**
 * Attach a sale (and optionally enrollment) to a converted CRM lead.
 * Admin client required for create / sale_only (organization_sales INSERT).
 */
export async function recordLeadSale(
  supabase: SupabaseClient,
  args: {
    organizationId: number
    leadId: number
    input: RecordLeadSaleInput
  }
): Promise<RecordLeadSaleResult> {
  const input = recordLeadSaleSchema.parse(args.input)

  const { data: leadRow, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, organization_id, email, full_name, status, enrollment_id, organization_sale_id, commissions_activated_at"
    )
    .eq("id", args.leadId)
    .eq("organization_id", args.organizationId)
    .single()
  if (leadError) throw new Error(leadError.message)
  const lead = leadSaleRowSchema.parse(leadRow)

  if (lead.status !== "converted") {
    throw new Error("Record a sale only on converted leads.")
  }
  if (lead.commissions_activated_at) {
    throw new Error("Commissions are already active. Cancel them before changing the sale link.")
  }

  if (input.mode === "create") {
    const created = await createManualEnrollment({
      supabase,
      organizationId: args.organizationId,
      offerId: input.offer_id,
      buyerEmail: lead.email,
      buyerName: lead.full_name,
      priceCents: input.price_cents,
      accessDurationMonths: input.access_duration_months,
      soldAt: input.sold_at,
    })

    await linkLeadToSale(supabase, lead.id, {
      organization_sale_id: created.saleId,
      enrollment_id: created.enrollmentId,
      sale_source: "manual",
      target_offer_id: input.offer_id,
    })

    return {
      enrollmentId: created.enrollmentId,
      saleId: created.saleId,
      saleSource: "manual",
    }
  }

  if (input.mode === "sale_only") {
    if (input.offer_id == null) {
      throw new Error("Select an offer for this sale.")
    }
    const soldAtIso = input.sold_at
      ? `${input.sold_at}T12:00:00.000Z`
      : new Date().toISOString()
    const { data: sale, error: saleError } = await supabase
      .from("organization_sales")
      .insert({
        organization_id: args.organizationId,
        enrollment_id: null,
        user_id: null,
        buyer_email: lead.email.trim().toLowerCase(),
        billing_type: "one_time",
        price: input.price_cents,
        currency: "eur",
        source: "manual",
        stripe_checkout_session_id: null,
        stripe_invoice_id: null,
        base_amount_cents: input.price_cents,
        installment_index: 1,
        installment_count: 1,
        sold_at: soldAtIso,
      })
      .select("id")
      .single()
    if (saleError || !sale) {
      throw new Error(saleError?.message ?? "Failed to create sale")
    }
    const saleId = Number(sale.id)
    if (!Number.isFinite(saleId)) throw new Error("Invalid sale id returned")

    await linkLeadToSale(supabase, lead.id, {
      organization_sale_id: saleId,
      enrollment_id: null,
      sale_source: "manual",
      target_offer_id: input.offer_id,
    })

    return { enrollmentId: null, saleId, saleSource: "manual" }
  }

  // link existing enrollment
  const { data: enrollmentRow, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(
      "id, organization_id, offer_id, buyer_email, user_id, stripe_checkout_session_id, stripe_subscription_id"
    )
    .eq("id", input.enrollment_id)
    .eq("organization_id", args.organizationId)
    .maybeSingle()
  if (enrollmentError) throw new Error(enrollmentError.message)
  if (!enrollmentRow) throw new Error("Enrollment not found in this organization.")

  const enrollment = enrollmentLinkSchema.parse(enrollmentRow)
  const saleSource: "platform" | "manual" =
    enrollment.stripe_checkout_session_id != null || enrollment.stripe_subscription_id != null
      ? "platform"
      : "manual"

  const { data: existingSale } = await supabase
    .from("organization_sales")
    .select("id")
    .eq("enrollment_id", enrollment.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let saleId =
    existingSale && typeof existingSale.id === "number" && Number.isFinite(existingSale.id)
      ? existingSale.id
      : null

  if (saleId == null) {
    let priceCents = 0
    if (enrollment.offer_id != null) {
      const { data: offerRow } = await supabase
        .from("offers")
        .select("price, currency")
        .eq("id", enrollment.offer_id)
        .maybeSingle()
      if (offerRow && typeof offerRow.price === "number") {
        priceCents = offerRow.price
      }
    }
    if (priceCents <= 0) {
      throw new Error("No sale found for this enrollment and offer has no price.")
    }
    const soldAtIso = input.sold_at
      ? `${input.sold_at}T12:00:00.000Z`
      : new Date().toISOString()
    const { data: sale, error: saleError } = await supabase
      .from("organization_sales")
      .insert({
        organization_id: args.organizationId,
        enrollment_id: enrollment.id,
        user_id: enrollment.user_id,
        buyer_email: enrollment.buyer_email,
        billing_type: "one_time",
        price: priceCents,
        currency: "eur",
        source: saleSource === "platform" ? "stripe" : "manual",
        stripe_checkout_session_id: enrollment.stripe_checkout_session_id,
        stripe_invoice_id: null,
        base_amount_cents: priceCents,
        installment_index: 1,
        installment_count: 1,
        sold_at: soldAtIso,
      })
      .select("id")
      .single()
    if (saleError || !sale) {
      throw new Error(saleError?.message ?? "Failed to create sale for enrollment")
    }
    saleId = Number(sale.id)
    if (!Number.isFinite(saleId)) throw new Error("Invalid sale id returned")
  }

  await linkLeadToSale(supabase, lead.id, {
    organization_sale_id: saleId,
    enrollment_id: enrollment.id,
    sale_source: saleSource,
    target_offer_id: enrollment.offer_id,
  })

  return { enrollmentId: enrollment.id, saleId, saleSource }
}
