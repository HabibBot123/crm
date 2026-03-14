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

  const { organizationId, org } = validation.data
  const body = validation.data.body as typeof validation.data.body & {
    offerId?: unknown
    paymentLinkId?: unknown
  }
  const offerId = Number(body.offerId)
  const paymentLinkId = body.paymentLinkId != null ? Number(body.paymentLinkId) : null

  if (!offerId || !Number.isFinite(offerId)) return badRequest("offerId is required")
  if (!paymentLinkId) {
    return badRequest(
      "paymentLinkId is required. The base offer link is generated automatically at publish time."
    )
  }

  if (!org.stripe_account_id) {
    return badRequest(
      "This organization does not have a Stripe Connect account. Complete onboarding first."
    )
  }

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select(
      "id, organization_id, title, billing_type, price, currency, interval, installment_count, stripe_price_id, stripe_product_id, status"
    )
    .eq("id", offerId)
    .single()

  if (offerError || !offer) return notFound("Offer not found")
  if (offer.organization_id !== organizationId) return notFound("Offer not found")
  if (offer.status !== "active") return badRequest("Offer must be published before creating payment links")
  if (!offer.stripe_price_id || !offer.stripe_product_id) {
    return badRequest("Offer does not have a Stripe price. Publish the offer first.")
  }

  type VariantRow = {
    id: number
    price: number | null
    installment_count: number | null
    stripe_price_id: string | null
  }

  const { data: link, error: linkError } = await supabase
    .from("offer_variants")
    .select("id, price, installment_count, stripe_price_id")
    .eq("id", paymentLinkId)
    .eq("offer_id", offerId)
    .single()

  if (linkError || !link) return notFound("Payment link variant not found")

  const variant = link as VariantRow
  const effectivePrice = variant.price ?? Number(offer.price)
  const effectiveInstallmentCount = variant.installment_count ?? offer.installment_count
  const isInstallmentFlow =
    (offer.billing_type === "installment" || offer.billing_type === "one_time") &&
    effectiveInstallmentCount != null &&
    effectiveInstallmentCount > 1

  try {
    // For non-installment variants with a custom price, resolve or create a variant price
    let stripePriceId: string = offer.stripe_price_id

    if (!isInstallmentFlow) {
      const needsNewPrice = variant.price !== null && variant.price !== Number(offer.price)

      if (needsNewPrice) {
        if (variant.stripe_price_id) {
          stripePriceId = variant.stripe_price_id
        } else {
          const unitAmount = Math.round(effectivePrice * 100)
          const variantPrice = await stripe.prices.create(
            offer.billing_type === "subscription"
              ? {
                  unit_amount: unitAmount,
                  currency: offer.currency,
                  recurring: { interval: offer.interval as "month" | "year" },
                  product: offer.stripe_product_id!,
                  metadata: {
                    offer_id: String(offer.id),
                    organization_id: String(organizationId),
                    variant_id: String(variant.id),
                  },
                }
              : {
                  unit_amount: unitAmount,
                  currency: offer.currency,
                  product: offer.stripe_product_id!,
                  metadata: {
                    offer_id: String(offer.id),
                    organization_id: String(organizationId),
                    variant_id: String(variant.id),
                  },
                },
            { stripeAccount: org.stripe_account_id }
          )

          await supabase
            .from("offer_variants")
            .update({ stripe_price_id: variantPrice.id })
            .eq("id", variant.id)

          stripePriceId = variantPrice.id
        }
      }
    }

    const metadata = {
      offer_id: String(offer.id),
      organization_id: String(organizationId),
      variant_id: String(variant.id),
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const baseAppUrl = appUrl.replace(/\/$/, "")
  const successUrl = `${baseAppUrl}/order-success` +
    `?product=${encodeURIComponent(offer.title)}` +
    `&coach=${encodeURIComponent(org.name ?? "")}` +
    `&price=${encodeURIComponent(String(effectivePrice))}` +
    `&currency=${encodeURIComponent(offer.currency)}`

    const { options } = await buildPaymentLinkOptions(
      org.stripe_account_id,
      {
        billingType: offer.billing_type,
        price: effectivePrice,
        currency: offer.currency,
        interval: offer.interval,
        installmentCount: effectiveInstallmentCount,
        stripePriceId,
        stripeProductId: offer.stripe_product_id!,
      },
      metadata,
      successUrl
    )

    const paymentLink = await stripe.paymentLinks.create(options, {
      stripeAccount: org.stripe_account_id,
    })

    const { error: updateError } = await supabase
      .from("offer_variants")
      .update({ stripe_payment_link: paymentLink.url })
      .eq("id", variant.id)

    if (updateError) {
      return serverError("Payment link created but failed to save URL", updateError.message)
    }

    return jsonResponse(200, { url: paymentLink.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe payment link creation failed:", error)
    return badGateway("Failed to create Stripe payment link", message)
  }
}
