import type { SupabaseAdmin } from "../types"
import {
  getBillingTypeForEnrollment,
  recordStripeSale,
  resolveEnrollmentByCustomer,
  resolveEnrollmentBySubscriptionId,
  resolveOrgByStripeAccount,
} from "../helpers"
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

  let orgId: number | null = null
  let enrollment = null

  if (stripeAccountId) {
    const org = await resolveOrgByStripeAccount(supabase, stripeAccountId)
    if (org) orgId = org.id
  }

  // 1) Subscription → enrollment
  if (subscriptionId) {
    enrollment = await resolveEnrollmentBySubscriptionId(supabase, subscriptionId)
    if (enrollment) orgId = enrollment.organization_id
  }

  // 2) Metadata org + customer (one-time invoice_creation / race-safe fallback)
  if (!enrollment && invoice.customer && orgId != null) {
    enrollment = await resolveEnrollmentByCustomer(
      supabase,
      orgId,
      invoice.customer
    )
  }

  // 3) Metadata organization_id on invoice / subscription_details
  if (!enrollment) {
    const metaOrg =
      invoice.metadata?.organization_id ??
      invoice.parent?.subscription_details?.metadata?.organization_id
    const metaOrgId = metaOrg ? Number(metaOrg) : null
    if (
      metaOrgId != null &&
      Number.isFinite(metaOrgId) &&
      invoice.customer
    ) {
      orgId = metaOrgId
      enrollment = await resolveEnrollmentByCustomer(
        supabase,
        metaOrgId,
        invoice.customer
      )
    }
  }

  if (enrollment && orgId != null) {
    const billingType = await getBillingTypeForEnrollment(supabase, enrollment)

    const meta = {
      ...(invoice.metadata ?? {}),
      ...(invoice.parent?.subscription_details?.metadata ?? {}),
    }

    const recorded = await recordStripeSale(supabase, {
      organizationId: orgId,
      enrollment,
      priceCents: price,
      currency,
      billingType,
      stripeCheckoutSessionId: null,
      stripeInvoiceId: invoice.id,
      metadata: Object.keys(meta).length > 0 ? meta : null,
    })

    console.log(
      `invoice.paid [${invoice.id}]: organization_sales ${recorded.status} id=${recorded.saleId} (amount ${price} ${currency})`
    )

    if (recorded.status === "inserted" && recorded.saleId != null) {
      const { maybeCreateOnPaymentCommissionsForSale } = await import(
        "@/lib/services/commissions"
      )
      try {
        await maybeCreateOnPaymentCommissionsForSale(supabase, recorded.saleId)
      } catch (err) {
        console.error(
          `invoice.paid [${invoice.id}]: on_payment commissions failed:`,
          err
        )
      }
    }
  } else {
    console.warn(
      `invoice.paid [${invoice.id}]: could not resolve enrollment — sale not written (checkout sale may still exist)`
    )
  }

  // Persist every paid invoice to coached_invoices (by org + customer)
  if (stripeAccountId && invoice.customer && amountPaid > 0) {
    let userId: string | null = null
    let buyerEmail: string | null = null
    let offerId: number | null = null
    let resolvedOrgId = orgId

    if (enrollment) {
      resolvedOrgId = enrollment.organization_id
      userId = enrollment.user_id
      buyerEmail = enrollment.buyer_email
      offerId = enrollment.offer_id
    } else if (resolvedOrgId == null) {
      const org = await resolveOrgByStripeAccount(supabase, stripeAccountId)
      if (org) {
        resolvedOrgId = org.id
        const enr = await resolveEnrollmentByCustomer(
          supabase,
          org.id,
          invoice.customer
        )
        if (enr) {
          userId = enr.user_id
          buyerEmail = enr.buyer_email
          offerId = enr.offer_id
        }
      }
    }

    if (resolvedOrgId != null) {
      const { error: invError } = await supabase.from("coached_invoices").upsert(
        {
          stripe_invoice_id: invoice.id,
          organization_id: resolvedOrgId,
          user_id: userId,
          buyer_email: buyerEmail,
          offer_id: offerId,
          amount_cents: amountPaid,
          currency,
          invoice_pdf_url: invoice.invoice_pdf ?? null,
          status: "paid",
          stripe_created_at:
            invoice.created != null
              ? new Date(invoice.created * 1000).toISOString()
              : null,
        },
        { onConflict: "stripe_invoice_id" }
      )

      if (invError) {
        console.error(`Failed to upsert coached_invoice ${invoice.id}:`, invError.message)
      }
    }
  }
}
