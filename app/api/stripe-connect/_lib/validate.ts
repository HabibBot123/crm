import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

export type StripeConnectBody = {
  organizationId?: number
  businessType?: "individual" | "company"
}

export type ValidatedStripeConnect = {
  user: { id: string; email?: string | null }
  organizationId: number
  org: {
    id: number
    name: string
    owner_id: string
    stripe_account_id: string | null
    stripe_onboarding_completed: boolean | null
  }
  body: StripeConnectBody
}

/**
 * Shared validation for Stripe Connect API routes: auth, body (organizationId), load org, owner check.
 * All three routes (create-account, account-link, account-status) require the organization owner.
 */
export async function validateStripeConnectOwner(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<
  | { ok: true; data: ValidatedStripeConnect }
  | { ok: false; response: NextResponse }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  let body: StripeConnectBody
  try {
    body = await req.json()
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }

  const rawOrgId = body.organizationId
  const organizationId = typeof rawOrgId === "number" ? rawOrgId : Number(rawOrgId)

  if (!organizationId || !Number.isFinite(organizationId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "organizationId is required" }, { status: 400 }),
    }
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, owner_id, stripe_account_id, stripe_onboarding_completed")
    .eq("id", organizationId)
    .is("deleted_at", null)
    .single()

  if (orgError || !org) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization not found" }, { status: 404 }),
    }
  }

  if (org.owner_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only the organization owner can perform this action." },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    data: {
      user: { id: user.id, email: user.email ?? undefined },
      organizationId,
      org: org as ValidatedStripeConnect["org"],
      body,
    },
  }
}
