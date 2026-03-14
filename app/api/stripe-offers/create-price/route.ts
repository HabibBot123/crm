import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "@/app/api/stripe-connect/_lib/validate"
import {
  badRequest,
  notFound,
  serverError,
  badGateway,
  jsonResponse,
} from "@/lib/api-helpers/api-response"
import { buildPaymentLinkOptions } from "../_lib/build-payment-link"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId, org, user } = validation.data
  const body = validation.data.body as typeof validation.data.body & { offerId?: unknown }
  const offerId = typeof body.offerId === "number" ? body.offerId : Number(body.offerId)

  if (!offerId || !Number.isFinite(offerId)) {
    return badRequest("offerId is required")
  }

  if (!org.stripe_account_id) {
    return badRequest(
      "This organization does not have a Stripe Connect account. Complete onboarding first."
    )
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("id, organization_id, title, billing_type, price, currency, interval, installment_count, stripe_price_id, status")
    .eq("id", offerId)
    .single()

  if (offerError || !offer) return notFound("Offer not found")
  if (offer.organization_id !== organizationId) return notFound("Offer not found")
  if (offer.status === "active") return badRequest("Offer is already published")
  if (!offer.price || offer.price <= 0) return badRequest("Offer price must be greater than 0")

  // Already published before — just reactivate
  if (offer.stripe_price_id) {
    const { error: activateError } = await supabase
      .from("offers")
      .update({ status: "active" })
      .eq("id", offerId)

    if (activateError) {
      return serverError("Failed to activate offer", activateError.message)
    }

    return jsonResponse(200, { stripe_price_id: offer.stripe_price_id })
  }

  const unitAmount = Math.round(Number(offer.price) * 100)

  try {
    // Create the canonical Stripe price for this offer
    let stripePrice

    if (offer.billing_type === "subscription") {
      if (!offer.interval) {
        return badRequest("interval (month/year) is required for subscription offers")
      }
      stripePrice = await stripe.prices.create(
        {
          unit_amount: unitAmount,
          currency: offer.currency,
          recurring: { interval: offer.interval as "month" | "year" },
          product_data: { name: offer.title },
          metadata: {
            offer_id: String(offer.id),
            organization_id: String(organizationId),
            created_by: user.id,
          },
        },
        { stripeAccount: org.stripe_account_id }
      )
    } else {
      stripePrice = await stripe.prices.create(
        {
          unit_amount: unitAmount,
          currency: offer.currency,
          product_data: { name: offer.title },
          metadata: {
            offer_id: String(offer.id),
            organization_id: String(organizationId),
            created_by: user.id,
            billing_type: offer.billing_type,
            ...(offer.installment_count
              ? { installment_count: String(offer.installment_count) }
              : {}),
          },
        },
        { stripeAccount: org.stripe_account_id }
      )
    }

    // Build and create the base payment link
    const metadata = {
      offer_id: String(offer.id),
      organization_id: String(organizationId),
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const baseAppUrl = appUrl.replace(/\/$/, "")
  const successUrl = `${baseAppUrl}/order-success` +
    `?product=${encodeURIComponent(offer.title)}` +
    `&coach=${encodeURIComponent(org.name ?? "")}` +
    `&price=${encodeURIComponent(String(offer.price))}` +
    `&currency=${encodeURIComponent(offer.currency)}`

    const { options } = await buildPaymentLinkOptions(
      org.stripe_account_id,
      {
        billingType: offer.billing_type,
        price: offer.price,
        currency: offer.currency,
        interval: offer.interval,
        installmentCount: offer.installment_count,
        stripePriceId: stripePrice.id,
        stripeProductId: String(stripePrice.product),
      },
      metadata,
      successUrl
    )

    const paymentLink = await stripe.paymentLinks.create(options, {
      stripeAccount: org.stripe_account_id,
    })

    const { error: updateError } = await supabase
      .from("offers")
      .update({
        stripe_price_id: stripePrice.id,
        stripe_product_id: String(stripePrice.product),
        stripe_payment_link: paymentLink.url,
        status: "active",
      })
      .eq("id", offerId)

    if (updateError) {
      return serverError("Stripe price created but failed to save to database", updateError.message)
    }

    return jsonResponse(200, {
      stripe_price_id: stripePrice.id,
      stripe_payment_link: paymentLink.url,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe price creation failed:", error)
    return badGateway("Failed to create Stripe price", message)
  }
}
