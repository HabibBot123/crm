import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "../_lib/validate"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId, org } = validation.data
  const stripeAccountId = org.stripe_account_id

  if (!stripeAccountId) {
    return NextResponse.json(
      {
        error:
          "No Stripe Connect account is associated with this organization. Please contact support to complete the configuration.",
      },
      { status: 400 }
    )
  }

  const requestUrl = new URL(req.url)
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `${requestUrl.protocol}//${requestUrl.host}`

  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${baseUrl}/dashboard/stripe-connect?organizationId=${organizationId}&refresh=1`,
      return_url: `${baseUrl}/dashboard/stripe-connect?organizationId=${organizationId}&success=1`,
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe account link creation failed:", error)
    return NextResponse.json(
      { error: "Failed to create Stripe onboarding link", details: message },
      { status: 502 }
    )
  }
}
