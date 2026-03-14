import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

/**
 * POST /api/stripe-connect/customer-portal
 * Creates a Stripe Customer Portal session for the logged-in user for a given coach (organization).
 * The user must be enrolled with that organization and have a stripe_customer_id.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { organizationId?: number }
  try {
    body = (await req.json()) as { organizationId?: number }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const organizationId =
    typeof body.organizationId === "number" ? body.organizationId : Number(body.organizationId)
  if (!organizationId || !Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 })
  }

  // Find an enrollment for this user and this org that has stripe_customer_id
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id, stripe_customer_id")
    .eq("organization_id", organizationId)
    .or(`user_id.eq.${user.id},buyer_email.eq.${user.email.toLowerCase()}`)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .maybeSingle()

  if (enrollError || !enrollment?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found for this coach, or you are not enrolled." },
      { status: 404 }
    )
  }

  // Get organization's Stripe Connect account
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("stripe_account_id")
    .eq("id", organizationId)
    .is("deleted_at", null)
    .single()

  if (orgError || !org?.stripe_account_id) {
    return NextResponse.json(
      { error: "This coach has not set up billing yet." },
      { status: 400 }
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const returnUrl = `${baseUrl.replace(/\/$/, "")}/coached/profile`

  try {
    const session = await stripe.billingPortal.sessions.create(
      {
        customer: enrollment.stripe_customer_id,
        return_url: returnUrl,
      },
      { stripeAccount: org.stripe_account_id }
    )

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Customer portal session creation failed:", message)
    return NextResponse.json(
      { error: "Failed to open billing portal", details: message },
      { status: 500 }
    )
  }
}
