import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { validateStripeConnectOwner } from "../_lib/validate"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId, org } = validation.data

  if (!org.stripe_account_id) {
    return NextResponse.json(
      {
        stripeAccountId: null,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        onboardingCompleted: false,
      },
      { status: 200 }
    )
  }

  try {
    const account = await stripe.accounts.retrieve(org.stripe_account_id)
    const acc = account as { payouts_enabled?: boolean; charges_enabled?: boolean; details_submitted?: boolean }

    const payoutsEnabled = Boolean(acc.payouts_enabled)
    const chargesEnabled = Boolean(acc.charges_enabled)
    const detailsSubmitted = Boolean(acc.details_submitted)
    const onboardingCompleted =
      payoutsEnabled && chargesEnabled && detailsSubmitted

    if (onboardingCompleted && !org.stripe_onboarding_completed) {
      await supabase
        .from("organizations")
        .update({ stripe_onboarding_completed: true })
        .eq("id", organizationId)
    }

    return NextResponse.json(
      {
        stripeAccountId: account.id,
        payoutsEnabled,
        chargesEnabled,
        detailsSubmitted,
        onboardingCompleted: onboardingCompleted || Boolean(org.stripe_onboarding_completed),
        requirements: null,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Stripe account status fetch failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch Stripe account status", details: message },
      { status: 502 }
    )
  }
}
