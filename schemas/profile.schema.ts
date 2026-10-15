import { z } from "zod"

export const profileSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable().optional(),
  signup_source: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
})

export const updateProfileInputSchema = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
})

export type Profile = z.infer<typeof profileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>
