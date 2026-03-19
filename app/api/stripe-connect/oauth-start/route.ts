import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateStripeConnectOwner } from "../_lib/validate"

const STRIPE_OAUTH_AUTHORIZE_URL = "https://connect.stripe.com/oauth/authorize"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const validation = await validateStripeConnectOwner(req, supabase)
  if (!validation.ok) return validation.response

  const { organizationId } = validation.data

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "Stripe Connect client ID is not configured on the server." },
      { status: 500 }
    )
  }

  const requestUrl = new URL(req.url)
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `${requestUrl.protocol}//${requestUrl.host}`

  const redirectUri = `${baseUrl}/api/stripe-connect/oauth-callback`

  // Encode organizationId in state so we know which org to attach in the callback.
  const statePayload = { organizationId }
  const state = Buffer.from(JSON.stringify(statePayload), "utf-8").toString("base64url")

  const authorizeUrl = new URL(STRIPE_OAUTH_AUTHORIZE_URL)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("scope", "read_write")
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)

  return NextResponse.json({ url: authorizeUrl.toString() })
}

