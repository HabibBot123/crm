import type { SupabaseClient } from "@supabase/supabase-js"

export type OrganizationDisplay = {
  id: number
  name: string
  slug: string
  stripe_account_id: string | null
  stripe_onboarding_completed: boolean
}

export async function fetchOrganizationsByIds(
  supabase: SupabaseClient,
  ids: number[]
): Promise<OrganizationDisplay[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, stripe_account_id, stripe_onboarding_completed")
    .in("id", ids)
    .is("deleted_at", null)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as OrganizationDisplay[]
}
