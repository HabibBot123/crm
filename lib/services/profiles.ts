import type { SupabaseClient } from "@supabase/supabase-js"
import {
  profileSchema,
  updateProfileInputSchema,
  type Profile,
  type UpdateProfileInput,
} from "@/schemas/profile.schema"

export async function fetchMyProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, avatar_url, bio, signup_source, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return profileSchema.parse(data)
}

export async function updateMyProfile(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const parsed = updateProfileInputSchema.parse(input)
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select(
      "user_id, full_name, avatar_url, bio, signup_source, created_at, updated_at"
    )
    .single()
  if (error) throw error
  return profileSchema.parse(data)
}
