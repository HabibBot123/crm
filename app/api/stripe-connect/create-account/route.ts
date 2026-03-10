import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "../_lib/validate"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { user, organizationId, org, body } = validation.data

  const businessType: "individual" | "company" =
    body.businessType === "company" || body.businessType === "individual"
      ? body.businessType
      : "individual"

  if (org.stripe_account_id) {
    return NextResponse.json({
      stripeAccountId: org.stripe_account_id,
      stripeOnboardingCompleted: org.stripe_onboarding_completed ?? false,
    })
  }

  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email: user.email ?? undefined,
      business_type: businessType,
      metadata: {
        organization_id: String(org.id),
        organization_business_type: businessType,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_completed: false,
      })
      .eq("id", organizationId)

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to save stripe_account_id in database.",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      stripeAccountId: account.id,
      stripeOnboardingCompleted: false,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe Connect account creation failed:", error)
    return NextResponse.json(
      {
        error: "Failed to create Stripe Connect account with Stripe.",
        details: message,
      },
      { status: 502 }
    )
  }
}
