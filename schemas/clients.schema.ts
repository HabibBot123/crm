import { z } from "zod"

export const clientSummarySchema = z.object({
  organization_id: z.number(),
  client_key: z.string(),
  user_id: z.string().nullable(),
  client_display: z.string(),
  client_email: z.string().nullable(),
  total_spent: z.coerce.number(),
  enrollment_count: z.coerce.number(),
  first_enrollment_started_at: z.string().nullable(),
  last_enrollment_expires_at: z.string().nullable(),
  status: z.enum(["active", "expired", "cancelled", "paused"]),
})

export type ClientSummary = z.infer<typeof clientSummarySchema>
