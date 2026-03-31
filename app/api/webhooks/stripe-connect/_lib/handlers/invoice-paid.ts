import type { SupabaseAdmin, EnrollmentRow } from "../types"
import { getBillingTypeForEnrollment, resolveOrgAndEnrollmentForInvoice } from "../helpers"
import { invoicePaidSchema } from "../schemas"

export async function handleInvoicePaid(
  supabase: SupabaseAdmin,
  rawObject: unknown,
  stripeAccountId: string | undefined
): Promise<void> {
  const parse = invoicePaidSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("invoice.paid: invalid payload", parse.error.flatten())
    return
  }
  const invoice = parse.data

  const subscriptionId =
    invoice.subscription ??
    invoice.parent?.subscription_details?.subscription ??
    null

  const amountPaid = invoice.amount_paid ?? 0
  if (amountPaid <= 0) return

  const price = amountPaid
  const currency = (invoice.currency ?? "eur").toLowerCase()

  // Resolve org + enrollment once (by subscription or by customer+account)
  let resolved: Awaited<ReturnType<typeof resolveOrgAndEnrollmentForInvoice>> = null

  if (
    subscriptionId &&
    (invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_create")
  ) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("stripe_account_id", stripeAccountId ?? "")
      .is("deleted_at", null)
      .maybeSingle()
    if (org) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, organization_id, offer_id, offer_variant_id, user_id, buyer_email")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle()
      if (enr) resolved = { org, enrollment: enr as EnrollmentRow }
    }
  } else if (!subscriptionId && invoice.customer && stripeAccountId) {
    resolved = await resolveOrgAndEnrollmentForInvoice(
      supabase,
      stripeAccountId,
      invoice.customer
    )
  }

  if (resolved) {
    const billingType = await getBillingTypeForEnrollment(supabase, resolved.enrollment)

    const { error: saleError } = await supabase.from("organization_sales").insert({
      organization_id: resolved.enrollment.organization_id,
      enrollment_id: resolved.enrollment.id,
      user_id: resolved.enrollment.user_id,
      buyer_email: resolved.enrollment.buyer_email,
      billing_type: billingType,
      price,
      currency,
      stripe_invoice_id: invoice.id,
    })

    if (saleError) {
      console.error(`Failed to insert sale for invoice ${invoice.id}:`, saleError.message)
    } else {
      console.log(`Sale recorded: invoice ${invoice.id}, amount ${price} ${currency}`)
    }
  }

  // Persist every paid invoice to coached_invoices (by org + customer)
  if (stripeAccountId && invoice.customer && amountPaid > 0) {
    let orgId: number | null = null
    let userId: string | null = null
    let buyerEmail: string | null = null
    let offerId: number | null = null

    if (resolved) {
      orgId = resolved.org.id
      userId = resolved.enrollment.user_id
      buyerEmail = resolved.enrollment.buyer_email
      offerId = resolved.enrollment.offer_id
    } else {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("stripe_account_id", stripeAccountId)
        .is("deleted_at", null)
        .maybeSingle()
      if (org) {
        orgId = org.id
        const { data: enr } = await supabase
          .from("enrollments")
          .select("user_id, buyer_email, offer_id")
          .eq("organization_id", org.id)
          .eq("stripe_customer_id", invoice.customer)
          .limit(1)
          .maybeSingle()
        if (enr) {
          userId = enr.user_id
          buyerEmail = enr.buyer_email
          offerId = enr.offer_id
        }
      }
    }

    if (orgId != null) {
      const { error: invError } = await supabase.from("coached_invoices").upsert(
        {
          stripe_invoice_id: invoice.id,
          organization_id: orgId,
          user_id: userId,
          buyer_email: buyerEmail,
          offer_id: offerId,
          amount_cents: amountPaid,
          currency,
          invoice_pdf_url: invoice.invoice_pdf ?? null,
          status: "paid",
          stripe_created_at:
            invoice.created != null ? new Date(invoice.created * 1000).toISOString() : null,
        },
        { onConflict: "stripe_invoice_id" }
      )

      if (invError) {
        console.error(`Failed to upsert coached_invoice ${invoice.id}:`, invError.message)
      }
    }
  }
}
