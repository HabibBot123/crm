import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "../_lib/validate"
import {
  badRequest,
  notFound,
  serverError,
  badGateway,
  jsonResponse,
} from "@/lib/api-helpers/api-response"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId, org, user } = validation.data
  const body = validation.data.body as typeof validation.data.body & {
    offerId?: unknown
    paymentLinkId?: unknown
  }

  const offerId = typeof body.offerId === "number" ? body.offerId : Number(body.offerId)
  const paymentLinkId =
    body.paymentLinkId != null ? Number(body.paymentLinkId) : null

  if (!offerId || !Number.isFinite(offerId)) {
    return badRequest("offerId is required")
  }

  if (!org.stripe_account_id) {
    return badRequest(
      "This organization does not have a Stripe Connect account. Complete onboarding first."
    )
  }

  try {
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(
        "id, organization_id, title, billing_type, price, currency, interval, installment_count, stripe_price_id, stripe_product_id, status"
      )
      .eq("id", offerId)
      .single()

    if (offerError || !offer) return notFound("Offer not found")
    if (offer.organization_id !== organizationId) return notFound("Offer not found")

    // 1) Publish base offer (no variant id) → create canonical product+price
    if (paymentLinkId == null) {
      if (offer.status === "active" && offer.stripe_price_id) {
        return jsonResponse(200, { stripe_price_id: offer.stripe_price_id })
      }

      if (!offer.price || offer.price <= 0) {
        return badRequest("Offer price must be greater than 0")
      }

      const unitAmount = Number(offer.price)

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

      const { error: updateError } = await supabase
        .from("offers")
        .update({
          stripe_price_id: stripePrice.id,
          stripe_product_id: String(stripePrice.product),
          status: "active",
        })
        .eq("id", offerId)

      if (updateError) {
        return serverError(
          "Stripe price created but failed to save to database",
          updateError.message
        )
      }

      return jsonResponse(200, {
        stripe_price_id: stripePrice.id,
      })
    }

    // 2) Generate or attach a Stripe price for a variant (offer_variants row)
    if (offer.status !== "active") {
      return badRequest("Offer must be published before generating variant prices")
    }
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
    const effectiveInstallmentCount =
      variant.installment_count ?? offer.installment_count

    const isInstallmentFlow =
      (offer.billing_type === "installment" || offer.billing_type === "one_time") &&
      effectiveInstallmentCount != null &&
      effectiveInstallmentCount > 1

    let variantStripePriceId: string | null = variant.stripe_price_id

    // a) Installment plans → create a recurring monthly price with per-installment amount
    if (isInstallmentFlow) {
      if (!variantStripePriceId) {
        const installmentUnitAmount = Math.round(
          (Number(effectivePrice) / effectiveInstallmentCount!) * 100
        )

        const installmentPrice = await stripe.prices.create(
          {
            unit_amount: installmentUnitAmount,
            currency: offer.currency,
            recurring: { interval: "month" },
            product: offer.stripe_product_id!,
            metadata: {
              offer_id: String(offer.id),
              organization_id: String(organizationId),
              variant_id: String(variant.id),
              installment_count: String(effectiveInstallmentCount),
              is_installment: "true",
            },
          },
          { stripeAccount: org.stripe_account_id }
        )

        const { error: updateVariantError } = await supabase
          .from("offer_variants")
          .update({ stripe_price_id: installmentPrice.id })
          .eq("id", variant.id)

        if (updateVariantError) {
          return serverError(
            "Installment price created but failed to save to database",
            updateVariantError.message
          )
        }

        variantStripePriceId = installmentPrice.id
      }

      return jsonResponse(200, { stripe_price_id: variantStripePriceId })
    }

    // b) Non-installment: either reuse base price or create a distinct variant price if needed
    const hasCustomPrice =
      variant.price !== null && variant.price !== Number(offer.price)

    if (!hasCustomPrice) {
      // Reuse base offer price; ensure variant row points to it for convenience
      if (!variantStripePriceId) {
        const { error: updateVariantError } = await supabase
          .from("offer_variants")
          .update({ stripe_price_id: offer.stripe_price_id })
          .eq("id", variant.id)

        if (updateVariantError) {
          return serverError(
            "Failed to attach base Stripe price to variant",
            updateVariantError.message
          )
        }

        variantStripePriceId = offer.stripe_price_id
      }

      return jsonResponse(200, { stripe_price_id: variantStripePriceId })
    }

    // Custom price: create or reuse a dedicated price for this variant
    if (!variantStripePriceId) {
      const unitAmount = Math.round(Number(effectivePrice) * 100)

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

      const { error: updateVariantError } = await supabase
        .from("offer_variants")
        .update({ stripe_price_id: variantPrice.id })
        .eq("id", variant.id)

      if (updateVariantError) {
        return serverError(
          "Variant price created but failed to save to database",
          updateVariantError.message
        )
      }

      variantStripePriceId = variantPrice.id
    }

    return jsonResponse(200, { stripe_price_id: variantStripePriceId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe price creation failed:", message)
    return badGateway("Failed to create Stripe price", message)
  }
}

