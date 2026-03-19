import type Stripe from "stripe"
import type { SupabaseAdmin } from "../types"
import { subscriptionCreatedSchema } from "../schemas"

export async function handleSubscriptionCreated(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  rawObject: unknown,
  stripeAccountId: string | undefined
): Promise<void> {
  const parse = subscriptionCreatedSchema.safeParse(rawObject)
  if (!parse.success) {
    console.warn("customer.subscription.created: invalid payload", parse.error.flatten())
    return
  }
  const subscription = parse.data

  console.log(
    `customer.subscription.created [${subscription.id}]: metadata=${JSON.stringify(subscription.metadata ?? {})}`
  )

  const cancelAfterCycles = subscription.metadata?.cancel_after_cycles
    ? parseInt(subscription.metadata.cancel_after_cycles, 10)
    : null

  if (!subscription.metadata?.is_installment) {
    console.log(
      `customer.subscription.created [${subscription.id}]: not an installment plan — skipping cancel_at`
    )
    return
  }

  if (!cancelAfterCycles || cancelAfterCycles < 2) {
    console.warn(
      `customer.subscription.created [${subscription.id}]: is_installment=true but cancel_after_cycles=${cancelAfterCycles} — cannot set cancel_at`
    )
    return
  }

  if (!subscription.start_date) {
    console.warn(
      `customer.subscription.created [${subscription.id}]: missing start_date — cannot compute cancel_at`
    )
    return
  }

  const periodStartSec = subscription.start_date
  const cancelAt = new Date(periodStartSec * 1000)
  cancelAt.setUTCMonth(cancelAt.getUTCMonth() + cancelAfterCycles)
  const cancelAtUnix = Math.floor(cancelAt.getTime() / 1000)

  console.log(
    `customer.subscription.created [${subscription.id}]: installment plan — ` +
      `total_installments=${cancelAfterCycles}, ` +
      `start=${new Date(periodStartSec * 1000).toISOString()}, ` +
      `cancel_at=${cancelAt.toISOString()} (payment 1 already collected at checkout; ${cancelAfterCycles - 1} renewal(s) remain)`
  )

  try {
    await stripe.subscriptions.update(
      subscription.id,
      { cancel_at: cancelAtUnix, proration_behavior: "none" },
      { stripeAccount: stripeAccountId ?? undefined }
    )
    console.log(
      `customer.subscription.created [${subscription.id}]: cancel_at set successfully → ${cancelAt.toISOString()}`
    )
  } catch (err) {
    console.error(
      `customer.subscription.created [${subscription.id}]: failed to set cancel_at:`,
      err
    )
  }
}
