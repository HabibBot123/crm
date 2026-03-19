import type { SupabaseAdmin } from "./types"
import type { EnrollmentRow, BillingType } from "./types"

export async function resolveUserIdByEmail(
  supabase: SupabaseAdmin,
  email: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_id_by_email", {
      p_email: email.trim().toLowerCase(),
    })
    if (error) {
      console.error("resolveUserIdByEmail rpc error:", error.message)
      return null
    }
    return (data as string | null) ?? null
  } catch (err) {
    console.error("resolveUserIdByEmail unexpected error:", err)
    return null
  }
}

export async function getBillingTypeForEnrollment(
  supabase: SupabaseAdmin,
  enrollment: EnrollmentRow
): Promise<BillingType> {
  const { data: offer } = await supabase
    .from("offers")
    .select("billing_type")
    .eq("id", enrollment.offer_id)
    .single()
  let billingType: BillingType =
    (offer?.billing_type as BillingType) ?? "one_time"

  if (enrollment.offer_variant_id != null) {
    const { data: variant } = await supabase
      .from("offer_variants")
      .select("installment_count")
      .eq("id", enrollment.offer_variant_id)
      .eq("offer_id", enrollment.offer_id)
      .maybeSingle()
    if (variant?.installment_count != null && variant.installment_count > 1) {
      billingType = "installment"
    } else {
      billingType = "one_time"
    }
  }

  return billingType
}

export type OrgAndEnrollment = {
  org: { id: number }
  enrollment: EnrollmentRow
}

export async function resolveOrgAndEnrollmentForInvoice(
  supabase: SupabaseAdmin,
  stripeAccountId: string,
  stripeCustomerId: string
): Promise<OrgAndEnrollment | null> {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_account_id", stripeAccountId)
    .is("deleted_at", null)
    .maybeSingle()

  if (!org) return null

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, organization_id, offer_id, offer_variant_id, user_id, buyer_email")
    .eq("organization_id", org.id)
    .eq("stripe_customer_id", stripeCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!enrollment) return null

  return { org, enrollment: enrollment as EnrollmentRow }
}
