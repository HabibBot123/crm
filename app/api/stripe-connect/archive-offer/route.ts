import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "../_lib/validate"
import {
  badRequest,
  notFound,
  serverError,
  badGateway,
  jsonResponse,
  ok,
} from "@/lib/api-helpers/api-response"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId, org } = validation.data
  const body = validation.data.body as typeof validation.data.body & {
    offerId?: unknown
  }

  const offerId = typeof body.offerId === "number" ? body.offerId : Number(body.offerId)

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
        "id, organization_id, status, stripe_product_id, stripe_price_id"
      )
      .eq("id", offerId)
      .single()

    if (offerError || !offer) return notFound("Offer not found", offerError?.message)
    if (offer.organization_id !== organizationId) return notFound("Offer not found")

    // If already archived, nothing to do
    if (offer.status === "archived") {
      return jsonResponse(200, { status: "archived" })
    }

    const stripeAccount = org.stripe_account_id

    // 1) Deactivate Stripe product, if any
    if (offer.stripe_product_id) {
      try {
        await stripe.products.update(
          offer.stripe_product_id,
          { active: false },
          { stripeAccount }
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return badGateway("Failed to archive Stripe product", message)
      }
    }

    // 2) Deactivate base Stripe price, if any
    if (offer.stripe_price_id) {
      try {
        await stripe.prices.update(
          offer.stripe_price_id,
          { active: false },
          { stripeAccount }
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return badGateway("Failed to archive Stripe price", message)
      }
    }

    // 3) Deactivate all variant prices linked to this offer
    const { data: variants, error: variantsError } = await supabase
      .from("offer_variants")
      .select("stripe_price_id")
      .eq("offer_id", offerId)

    if (variantsError) {
      return serverError("Failed to load offer variants", variantsError.message)
    }

    for (const v of variants ?? []) {
      if (!v.stripe_price_id) continue
      try {
        await stripe.prices.update(
          v.stripe_price_id,
          { active: false },
          { stripeAccount }
        )
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return badGateway("Failed to archive variant Stripe price", message)
      }
    }

    // 4) Mark offer as archived in our database
    const { data: updated, error: updateError } = await supabase
      .from("offers")
      .update({ status: "archived" })
      .eq("id", offerId)
      .select("id, status")
      .single()

    if (updateError || !updated) {
      return serverError(
        "Failed to update offer status to archived",
        updateError?.message
      )
    }

    return ok({ status: updated.status })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Offer archive failed:", message)
    return badGateway("Failed to archive offer", message)
  }
}

