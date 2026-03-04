import { createClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase client with service role key.
 * Bypasses RLS and can call Admin API (e.g. updateUserById for custom claims).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL")
  }

  return createClient(url, serviceRoleKey)
}
