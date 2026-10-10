import { z } from "zod"
import type { SupabaseAdmin } from "./types"
import type { EnrollmentRow, BillingType } from "./types"

const enrollmentRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  offer_id: z.number(),
  offer_variant_id: z.number().nullable(),
  user_id: z.string().nullable(),
  buyer_email: z.string().nullable(),
  stripe_checkout_session_id: z.string().nullable().optional().default(null),
})

const ENROLLMENT_SELECT =
  "id, organization_id, offer_id, offer_variant_id, user_id, buyer_email, stripe_checkout_session_id"

function parseEnrollmentRow(row: unknown): EnrollmentRow | null {
  const parsed = enrollmentRowSchema.safeParse(row)
  if (!parsed.success) return null
  return {
    id: parsed.data.id,
    organization_id: parsed.data.organization_id,
    offer_id: parsed.data.offer_id,
    offer_variant_id: parsed.data.offer_variant_id,
    user_id: parsed.data.user_id,
    buyer_email: parsed.data.buyer_email,
    stripe_checkout_session_id: parsed.data.stripe_checkout_session_id ?? null,
  }
}

export async function resolveUserIdByEmail(
  supabase: SupabaseAdmin,
  email: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_id_by_email", {
      p_email: email.trim().toLowerCase(),
    })
    if (error) {
      console.error("resolveUserIdByEmail rpc error:", error.message)
      return null
    }
    if (typeof data === "string") return data
    return null
  } catch (err) {
    console.error("resolveUserIdByEmail unexpected error:", err)
    return null
  }
}

const billingTypeSchema = z.enum(["one_time", "subscription", "installment"])

export async function getBillingTypeForEnrollment(
  supabase: SupabaseAdmin,
  enrollment: EnrollmentRow
): Promise<BillingType> {
  const { data: offer } = await supabase
    .from("offers")
    .select("billing_type")
    .eq("id", enrollment.offer_id)
    .single()

  const fromOffer = billingTypeSchema.safeParse(offer?.billing_type)
  let billingType: BillingType = fromOffer.success ? fromOffer.data : "one_time"

  if (enrollment.offer_variant_id != null) {
    const { data: variant } = await supabase
      .from("offer_variants")
      .select("installment_count")
      .eq("id", enrollment.offer_variant_id)
      .eq("offer_id", enrollment.offer_id)
      .maybeSingle()
    if (variant?.installment_count != null && variant.installment_count > 1) {
      billingType = "installment"
    } else if (billingType === "installment") {
      billingType = "one_time"
    }
  }

  return billingType
}

export type OrgAndEnrollment = {
  org: { id: number }
  enrollment: EnrollmentRow
}

export async function resolveOrgByStripeAccount(
  supabase: SupabaseAdmin,
  stripeAccountId: string
): Promise<{ id: number } | null> {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_account_id", stripeAccountId)
    .is("deleted_at", null)
    .maybeSingle()
  if (!org || typeof org.id !== "number") return null
  return { id: org.id }
}

export async function resolveEnrollmentBySubscriptionId(
  supabase: SupabaseAdmin,
  subscriptionId: string
): Promise<EnrollmentRow | null> {
  const { data } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()
  return parseEnrollmentRow(data)
}

export async function resolveEnrollmentByCheckoutSessionId(
  supabase: SupabaseAdmin,
  checkoutSessionId: string
): Promise<EnrollmentRow | null> {
  const { data } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle()
  return parseEnrollmentRow(data)
}

export async function resolveEnrollmentByCustomer(
  supabase: SupabaseAdmin,
  organizationId: number,
  stripeCustomerId: string
): Promise<EnrollmentRow | null> {
  const { data } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("organization_id", organizationId)
    .eq("stripe_customer_id", stripeCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return parseEnrollmentRow(data)
}

/** @deprecated prefer resolveEnrollment* helpers — kept for call sites */
export async function resolveOrgAndEnrollmentForInvoice(
  supabase: SupabaseAdmin,
  stripeAccountId: string,
  stripeCustomerId: string
): Promise<OrgAndEnrollment | null> {
  const org = await resolveOrgByStripeAccount(supabase, stripeAccountId)
  if (!org) return null
  const enrollment = await resolveEnrollmentByCustomer(
    supabase,
    org.id,
    stripeCustomerId
  )
  if (!enrollment) return null
  return { org, enrollment }
}

export type RecordStripeSaleInput = {
  organizationId: number
  enrollment: EnrollmentRow
  priceCents: number
  currency: string
  billingType: BillingType
  stripeCheckoutSessionId?: string | null
  stripeInvoiceId?: string | null
  /** Pack / deal base (installments). */
  baseAmountCents?: number | null
  installmentCount?: number | null
  metadata?: Record<string, string> | null
}

export type RecordStripeSaleResult = {
  status: "inserted" | "updated" | "skipped"
  saleId: number | null
}

function readPositiveInt(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.trunc(n)
}

async function countSalesForEnrollment(
  supabase: SupabaseAdmin,
  enrollmentId: number
): Promise<number> {
  const { count, error } = await supabase
    .from("organization_sales")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
  if (error) {
    console.error("countSalesForEnrollment:", error.message)
    return 0
  }
  return count ?? 0
}

async function resolveBaseAmountCents(
  supabase: SupabaseAdmin,
  enrollment: EnrollmentRow,
  input: RecordStripeSaleInput
): Promise<number | null> {
  if (input.baseAmountCents != null && input.baseAmountCents > 0) {
    return input.baseAmountCents
  }
  const fromMeta = readPositiveInt(input.metadata?.base_amount_cents)
  if (fromMeta != null) return fromMeta

  if (enrollment.offer_variant_id != null) {
    const { data: variant } = await supabase
      .from("offer_variants")
      .select("price")
      .eq("id", enrollment.offer_variant_id)
      .maybeSingle()
    if (typeof variant?.price === "number" && variant.price > 0) return variant.price
  }

  const { data: offer } = await supabase
    .from("offers")
    .select("price")
    .eq("id", enrollment.offer_id)
    .maybeSingle()
  if (typeof offer?.price === "number" && offer.price > 0) return offer.price
  return null
}

/**
 * Idempotent Stripe → organization_sales writer.
 * Prefer attaching invoice_id onto an existing checkout sale (no double count).
 */
export async function recordStripeSale(
  supabase: SupabaseAdmin,
  input: RecordStripeSaleInput
): Promise<RecordStripeSaleResult> {
  if (input.priceCents <= 0) return { status: "skipped", saleId: null }

  if (input.stripeInvoiceId) {
    const { data: byInvoice } = await supabase
      .from("organization_sales")
      .select("id")
      .eq("stripe_invoice_id", input.stripeInvoiceId)
      .maybeSingle()
    if (byInvoice && typeof byInvoice.id === "number") {
      return { status: "skipped", saleId: byInvoice.id }
    }
  }

  if (input.stripeCheckoutSessionId) {
    const { data: byCheckout } = await supabase
      .from("organization_sales")
      .select("id, stripe_invoice_id")
      .eq("stripe_checkout_session_id", input.stripeCheckoutSessionId)
      .maybeSingle()

    if (byCheckout && typeof byCheckout.id === "number") {
      if (input.stripeInvoiceId && byCheckout.stripe_invoice_id == null) {
        const { error } = await supabase
          .from("organization_sales")
          .update({ stripe_invoice_id: input.stripeInvoiceId })
          .eq("id", byCheckout.id)
        if (error) {
          console.error(
            `Failed to attach invoice ${input.stripeInvoiceId} to sale ${byCheckout.id}:`,
            error.message
          )
          return { status: "skipped", saleId: byCheckout.id }
        }
        return { status: "updated", saleId: byCheckout.id }
      }
      return { status: "skipped", saleId: byCheckout.id }
    }
  }

  // First invoice after checkout: attach to sale keyed by enrollment checkout session
  if (
    input.stripeInvoiceId &&
    input.enrollment.stripe_checkout_session_id &&
    !input.stripeCheckoutSessionId
  ) {
    const { data: byEnrollmentCheckout } = await supabase
      .from("organization_sales")
      .select("id, stripe_invoice_id")
      .eq("stripe_checkout_session_id", input.enrollment.stripe_checkout_session_id)
      .maybeSingle()

    if (
      byEnrollmentCheckout &&
      typeof byEnrollmentCheckout.id === "number" &&
      byEnrollmentCheckout.stripe_invoice_id == null
    ) {
      const { error } = await supabase
        .from("organization_sales")
        .update({ stripe_invoice_id: input.stripeInvoiceId })
        .eq("id", byEnrollmentCheckout.id)
      if (error) {
        console.error(
          `Failed to attach invoice ${input.stripeInvoiceId} to sale ${byEnrollmentCheckout.id}:`,
          error.message
        )
        return { status: "skipped", saleId: byEnrollmentCheckout.id }
      }
      return { status: "updated", saleId: byEnrollmentCheckout.id }
    }
  }

  let baseAmountCents: number | null = null
  let installmentIndex: number | null = null
  let installmentCount: number | null = null

  if (input.billingType === "installment") {
    baseAmountCents = await resolveBaseAmountCents(supabase, input.enrollment, input)
    installmentCount =
      input.installmentCount ??
      readPositiveInt(input.metadata?.installment_count) ??
      readPositiveInt(input.metadata?.cancel_after_cycles)
    const prior = await countSalesForEnrollment(supabase, input.enrollment.id)
    installmentIndex = prior + 1
  } else if (input.billingType === "one_time") {
    baseAmountCents = input.priceCents
    installmentIndex = 1
    installmentCount = 1
  }

  const { data: inserted, error } = await supabase
    .from("organization_sales")
    .insert({
      organization_id: input.organizationId,
      enrollment_id: input.enrollment.id,
      user_id: input.enrollment.user_id,
      buyer_email: input.enrollment.buyer_email,
      billing_type: input.billingType,
      price: input.priceCents,
      currency: input.currency,
      source: "stripe",
      stripe_checkout_session_id: input.stripeCheckoutSessionId ?? null,
      stripe_invoice_id: input.stripeInvoiceId ?? null,
      base_amount_cents: baseAmountCents,
      installment_index: installmentIndex,
      installment_count: installmentCount,
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { status: "skipped", saleId: null }
    console.error("Failed to insert organization_sales:", error.message)
    return { status: "skipped", saleId: null }
  }

  const saleId = typeof inserted?.id === "number" ? inserted.id : null
  return { status: "inserted", saleId }
}
