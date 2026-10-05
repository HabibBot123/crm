import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

type Body = {
  offerId?: number | string
  paymentLinkId?: number | string | null
  email?: string | null
  fullName?: string | null
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rawOfferId = body.offerId
  const rawPaymentLinkId = body.paymentLinkId ?? null
  const emailInput = (body.email ?? "").trim().toLowerCase()
  const fullName = (body.fullName ?? "").trim() || null
  const hasBuyerEmail = emailInput.length > 0

  const offerId = typeof rawOfferId === "number" ? rawOfferId : Number(rawOfferId)
  const paymentLinkId =
    rawPaymentLinkId == null
      ? null
      : typeof rawPaymentLinkId === "number"
        ? rawPaymentLinkId
        : Number(rawPaymentLinkId)

  if (!offerId || !Number.isFinite(offerId)) {
    return NextResponse.json({ error: "offerId is required" }, { status: 400 })
  }

  try {
    // 1) Load offer + organization (for Stripe account)
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select(
        "id, organization_id, title, billing_type, price, currency, interval, installment_count, stripe_price_id, stripe_product_id, status"
      )
      .eq("id", offerId)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }

    if (offer.status !== "active") {
      return NextResponse.json(
        { error: "Offer must be published before checkout" },
        { status: 400 }
      )
    }

    const { data: linkedProducts, error: productsError } = await supabase
      .from("offer_products")
      .select("product_id, products!inner(id, status)")
      .eq("offer_id", offer.id)

    if (productsError) {
      return NextResponse.json(
        { error: "Unable to validate offer products" },
        { status: 500 }
      )
    }

    const rows = linkedProducts ?? []
    const activeProductCount = rows.filter((row) => {
      if (row == null || typeof row !== "object") return false
      if (!("products" in row)) return false
      const products = row.products
      const product = Array.isArray(products) ? products[0] : products
      if (product == null || typeof product !== "object") return false
      if (!("status" in product)) return false
      return product.status === "published"
    }).length

    if (activeProductCount === 0) {
      return NextResponse.json(
        { error: "This offer has no active products and cannot be purchased" },
        { status: 400 }
      )
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, stripe_account_id")
      .eq("id", offer.organization_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (!org.stripe_account_id) {
      return NextResponse.json(
        { error: "Coach is not connected to Stripe" },
        { status: 400 }
      )
    }

    // 2) If a variant/payment link id is provided, resolve its specific price
    type VariantRow = {
      id: number
      price: number | null
      installment_count: number | null
      stripe_price_id: string | null
    }

    let stripePriceId: string | null = offer.stripe_price_id
    let variant: VariantRow | null = null

    if (paymentLinkId != null) {
      const { data: link, error: linkError } = await supabase
        .from("offer_variants")
        .select("id, price, installment_count, stripe_price_id")
        .eq("id", paymentLinkId)
        .eq("offer_id", offer.id)
        .single()

      if (linkError || !link) {
        return NextResponse.json(
          { error: "Payment link variant not found" },
          { status: 404 }
        )
      }

      variant = link as VariantRow

      // For now we require that variant.stripe_price_id soit déjà créé (via le dashboard).
      if (!variant.stripe_price_id) {
        return NextResponse.json(
          {
            error:
              "This variant does not have a Stripe price yet. Generate it from the dashboard first.",
          },
          { status: 400 }
        )
      }

      stripePriceId = variant.stripe_price_id
    }

    const effectivePrice = variant?.price ?? Number(offer.price)
    const effectiveInstallmentCount = variant?.installment_count ?? offer.installment_count ?? null
    const isInstallmentFlow =
      (offer.billing_type === "installment" || offer.billing_type === "one_time") &&
      effectiveInstallmentCount != null &&
      effectiveInstallmentCount > 1

    if (!stripePriceId) {
      return NextResponse.json(
        { error: "Offer does not have a Stripe price. Publish the offer first." },
        { status: 400 }
      )
    }

    // 3) Optional: find or create Stripe customer when email was collected upstream.
    // Direct checkout (interstitial) leaves email empty — Stripe Checkout collects it.
    let stripeCustomerId: string | null = null

    if (hasBuyerEmail) {
      const email = emailInput
      const { data: existingEnrollment } = await supabase
        .from("enrollments")
        .select("stripe_customer_id")
        .eq("organization_id", offer.organization_id)
        .eq("buyer_email", email)
        .not("stripe_customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingEnrollment?.stripe_customer_id) {
        stripeCustomerId = existingEnrollment.stripe_customer_id
      } else {
        const customers = await stripe.customers.list(
          { email, limit: 1 },
          { stripeAccount: org.stripe_account_id }
        )

        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0]!.id
        } else {
          const customer = await stripe.customers.create(
            {
              email,
              name: fullName || undefined,
            },
            { stripeAccount: org.stripe_account_id }
          )
          stripeCustomerId = customer.id
        }
      }
    }

    // 4) Create Checkout Session on the coach's Stripe account
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const baseAppUrl = appUrl.replace(/\/$/, "")
    const orgSlug = typeof org.slug === "string" ? org.slug : ""

    const displayPriceCents =
      isInstallmentFlow && effectiveInstallmentCount != null && effectiveInstallmentCount > 0
        ? Math.round(effectivePrice / effectiveInstallmentCount)
        : effectivePrice

    // Success always returns to CoachStack (account linking / delivery), never the coach's site.
    const successUrl =
      `${baseAppUrl}/order-success` +
      `?product=${encodeURIComponent(offer.title)}` +
      `&coach=${encodeURIComponent(org.name ?? "")}` +
      `&price=${encodeURIComponent(String(displayPriceCents))}` +
      `&currency=${encodeURIComponent(offer.currency)}`

    // Cancel returns to the same CoachStack checkout entry (retry), not an arbitrary external URL.
    const cancelUrl =
      orgSlug.length > 0
        ? `${baseAppUrl}/org/${orgSlug}/buy/${offer.id}${
            paymentLinkId != null ? `?variantId=${paymentLinkId}` : ""
          }`
        : `${baseAppUrl}/`

    // Installments use a recurring price → must use subscription mode (with cancel_after_cycles)
    const isSubscription =
      offer.billing_type === "subscription" || isInstallmentFlow

    const sessionMetadata: Record<string, string> = {
      offer_id: String(offer.id),
      organization_id: String(offer.organization_id),
      billing_type: offer.billing_type,
      ...(paymentLinkId != null ? { variant_id: String(paymentLinkId) } : {}),
      ...(effectiveInstallmentCount != null && effectiveInstallmentCount > 0
        ? { installment_count: String(effectiveInstallmentCount) }
        : {}),
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
      name_collection: {
        individual: {
          enabled: true,
          optional: false,
        },
      },
      ...(!isSubscription
        ? { invoice_creation: { enabled: true } }
        : {}),
      ...(isSubscription && isInstallmentFlow && effectiveInstallmentCount != null && effectiveInstallmentCount > 1
        ? {
            subscription_data: {
              metadata: {
                ...sessionMetadata,
                cancel_after_cycles: String(effectiveInstallmentCount),
                is_installment: "true",
              },
            },
          }
        : {}),
    }

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
    } else if (hasBuyerEmail) {
      sessionParams.customer_email = emailInput
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      { stripeAccount: org.stripe_account_id }
    )

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Failed to create Stripe Checkout session:", message)
    return NextResponse.json(
      { error: "Failed to create Stripe Checkout session", details: message },
      { status: 500 }
    )
  }
}

