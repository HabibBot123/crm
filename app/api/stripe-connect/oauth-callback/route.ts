import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

type OAuthTokenResponse = {
  stripe_user_id?: string
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description") ?? undefined
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  const baseAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    `${url.protocol}//${url.host}`

  const redirectWithParams = (params: Record<string, string | number | boolean | null>) => {
    const target = new URL("/dashboard/stripe-connect", baseAppUrl)
    for (const [key, value] of Object.entries(params)) {
      if (value === null) continue
      target.searchParams.set(key, String(value))
    }
    return NextResponse.redirect(target.toString())
  }

  if (error) {
    return redirectWithParams({
      error: errorDescription ?? error,
    })
  }

  if (!code || !state) {
    return redirectWithParams({
      error: "Missing OAuth parameters from Stripe.",
    })
  }

  let organizationId: number | null = null
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8")
    const parsed = JSON.parse(decoded) as { organizationId?: number }
    if (parsed.organizationId && Number.isFinite(parsed.organizationId)) {
      organizationId = parsed.organizationId
    }
  } catch {
    // fall through
  }

  if (!organizationId) {
    return redirectWithParams({
      error: "Invalid or missing organization information in OAuth state.",
    })
  }

  try {
    const tokenResponse = (await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    })) as OAuthTokenResponse

    if (!tokenResponse.stripe_user_id) {
      return redirectWithParams({
        organizationId,
        error: "Stripe did not return a connected account id.",
      })
    }

    const supabaseAdmin = createAdminClient()
    const { error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({
        stripe_account_id: tokenResponse.stripe_user_id,
        stripe_onboarding_completed: true,
      })
      .eq("id", organizationId)

    if (updateError) {
      return redirectWithParams({
        organizationId,
        error: "Failed to save Stripe account connection.",
      })
    }

    return redirectWithParams({
      organizationId,
      success: 1,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("Stripe OAuth callback failed:", message)
    return redirectWithParams({
      organizationId,
      error: "Failed to complete Stripe connection.",
    })
  }
}

