export type EnrollmentRow = {
  id: number
  organization_id: number
  offer_id: number
  offer_variant_id: number | null
  user_id: string | null
  buyer_email: string | null
}

export type BillingType = "one_time" | "subscription" | "installment"

import type { createAdminClient } from "@/lib/supabase/admin"

export type SupabaseAdmin = ReturnType<typeof createAdminClient>

export type StripeConnectEvent = {
  type: string
  account?: string
  data: { object: unknown }
}
