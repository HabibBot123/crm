import type { SupabaseAdmin } from "../types"
import { subscriptionDeletedSchema } from "../schemas"

export async function handleSubscriptionDeleted(
  supabase: SupabaseAdmin,
  rawObject: unknown
): Promise<void> {
  const parse = subscriptionDeletedSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("customer.subscription.deleted: invalid payload", parse.error.flatten())
    return
  }
  const subscription = parse.data

  let status: "expired" | "cancelled" = "cancelled"

  if (subscription.metadata?.is_installment === "true") {
    const cancelAfterCycles = subscription.metadata?.cancel_after_cycles
      ? parseInt(subscription.metadata.cancel_after_cycles, 10)
      : null
    const startDate = subscription.start_date

    if (cancelAfterCycles != null && startDate != null) {
      const expectedEndDate = new Date(startDate * 1000)
      expectedEndDate.setUTCMonth(expectedEndDate.getUTCMonth() + cancelAfterCycles)
      const expectedYear = expectedEndDate.getUTCFullYear()
      const expectedMonth = expectedEndDate.getUTCMonth()

      const actualEndTimestamp =
        subscription.ended_at ??
        subscription.cancel_at ??
        subscription.current_period_end
      if (actualEndTimestamp != null) {
        const actualEndDate = new Date(actualEndTimestamp * 1000)
        const actualYear = actualEndDate.getUTCFullYear()
        const actualMonth = actualEndDate.getUTCMonth()

        if (actualYear === expectedYear && actualMonth === expectedMonth) {
          status = "expired"
        }
      }
    }
  }

  const { error } = await supabase
    .from("enrollments")
    .update({ status })
    .eq("stripe_subscription_id", subscription.id)

  if (error) {
    console.error(
      `Failed to update enrollment for subscription ${subscription.id}:`,
      error.message
    )
  } else {
    console.log(`Enrollment for subscription ${subscription.id} updated to ${status}`)
  }
}
