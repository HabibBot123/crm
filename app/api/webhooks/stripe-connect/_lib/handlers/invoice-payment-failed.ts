import type { SupabaseAdmin } from "../types"
import { invoicePaymentFailedSchema } from "../schemas"

export async function handleInvoicePaymentFailed(
  supabase: SupabaseAdmin,
  rawObject: unknown
): Promise<void> {
  const parse = invoicePaymentFailedSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("invoice.payment_failed: invalid payload", parse.error.flatten())
    return
  }
  const invoice = parse.data

  if (invoice.subscription) {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: "paused" })
      .eq("stripe_subscription_id", invoice.subscription)

    if (error) {
      console.error(
        `Failed to pause enrollment for subscription ${invoice.subscription}:`,
        error.message
      )
    }
  }
}
