import type { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { forbidden, serverError } from "@/lib/api-helpers/api-response"
import { isOrgCapability, type OrgCapability } from "@/lib/permissions/capabilities"

type AssertOk = { ok: true }
type AssertFail = { ok: false; response: NextResponse }
export type AssertOrgCapabilityResult = AssertOk | AssertFail

/**
 * Server-side capability check via SQL `has_org_capability` (auth.uid() from the
 * user-scoped Supabase client). Use before any admin-client / privileged work.
 */
export async function assertOrgCapability(
  supabase: SupabaseClient,
  organizationId: number,
  capability: OrgCapability
): Promise<AssertOrgCapabilityResult> {
  if (!isOrgCapability(capability)) {
    return { ok: false, response: forbidden("Forbidden") }
  }

  const { data, error } = await supabase.rpc("has_org_capability", {
    p_organization_id: organizationId,
    p_capability: capability,
  })

  if (error) {
    return {
      ok: false,
      response: serverError("Unable to verify permissions", error.message),
    }
  }

  if (data !== true) {
    return { ok: false, response: forbidden("Forbidden") }
  }

  return { ok: true }
}
