import type { SupabaseAdmin } from "../types"
import { SUBSCRIPTION_STATUS_TO_ENROLLMENT } from "../constants"
import { subscriptionUpdatedSchema } from "../schemas"

export async function handleSubscriptionUpdated(
  supabase: SupabaseAdmin,
  rawObject: unknown
): Promise<void> {
  const parse = subscriptionUpdatedSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("customer.subscription.updated: invalid payload", parse.error.flatten())
    return
  }
  const subscription = parse.data

  const newStatus = SUBSCRIPTION_STATUS_TO_ENROLLMENT[subscription.status]
  if (newStatus) {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: newStatus })
      .eq("stripe_subscription_id", subscription.id)

    if (error) {
      console.error(
        `Failed to update enrollment for subscription ${subscription.id}:`,
        error.message
      )
    }
  }
}
