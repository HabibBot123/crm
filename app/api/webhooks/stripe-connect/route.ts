import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Resolve a Supabase user id from a buyer email using a SECURITY DEFINER RPC.
 *  The auth schema is not exposed via PostgREST, so we use a dedicated SQL function.
 */
async function resolveUserIdByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_id_by_email", {
      p_email: email.trim().toLowerCase(),
    })

    if (error) {
      console.error("resolveUserIdByEmail rpc error:", error.message)
      return null
    }

    return (data as string | null) ?? null
  } catch (err) {
    console.error("resolveUserIdByEmail unexpected error:", err)
    return null
  }
}

// ----------------------------------------------------------------
// Webhook handler
// ----------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Stripe webhook signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature", details: message }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      // ----------------------------------------------------------------
      // New purchase completed
      // ----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string
          amount_total?: number | null
          currency?: string | null
          metadata?: Record<string, string>
          customer?: string | null
          customer_details?: { email?: string | null } | null
          subscription?: string | null
          payment_intent?: string | null
        }

        const offerId = session.metadata?.offer_id
          ? Number(session.metadata.offer_id)
          : null
        const organizationId = session.metadata?.organization_id
          ? Number(session.metadata.organization_id)
          : null
        const variantId = session.metadata?.variant_id
          ? Number(session.metadata.variant_id)
          : null

        if (!offerId || !organizationId) {
          console.warn(
            `checkout.session.completed [${session.id}]: missing offer_id or organization_id in metadata — skipping`
          )
          break
        }

        // buyer_email is always stored — it's the source of truth for reconciliation.
        // user_id is resolved immediately if a matching Supabase account exists.
        // If not (user hasn't registered yet), the enrollment is saved with
        // user_id = null and will be reconciled at sign-in time.
        const buyerEmail = session.customer_details?.email?.trim().toLowerCase() ?? null
        if (!buyerEmail) {
          console.warn(
            `checkout.session.completed [${session.id}]: no customer email — cannot create enrollment`
          )
          break
        }

        const userId = await resolveUserIdByEmail(supabase, buyerEmail)
        if (!userId) {
          console.info(
            `checkout.session.completed [${session.id}]: no Supabase user for "${buyerEmail}" — enrollment saved without user_id (will reconcile at sign-in)`
          )
        }

        // Fetch coaching period_months to compute expires_at.
        // Expiry is calendar-based (e.g. Jan 3 + 1 month = Feb 3) to avoid
        // day-count drift from varying month lengths.
        let expiresAt: string | null = null

        const { data: offerProducts, error: opError } = await supabase
          .from("offer_products")
          .select("product_id, products(type)")
          .eq("offer_id", offerId)

        if (opError) {
          console.error(
            `checkout.session.completed [${session.id}]: failed to fetch offer_products:`,
            opError.message
          )
        }

        if (offerProducts) {
          type OpRow = {
            product_id: number
            products: { type: string } | { type: string }[] | null
          }
          const rows = offerProducts as unknown as OpRow[]

          const getType = (p: OpRow["products"]): string | undefined =>
            Array.isArray(p) ? p[0]?.type : p?.type

          const coachingProductId = rows.find(
            (op) => getType(op.products) === "coaching"
          )?.product_id

          if (coachingProductId) {
            const { data: coaching, error: coachingError } = await supabase
              .from("product_coaching")
              .select("period_months")
              .eq("product_id", coachingProductId)
              .single()

            if (coachingError) {
              console.error(
                `checkout.session.completed [${session.id}]: failed to fetch product_coaching for product ${coachingProductId}:`,
                coachingError.message
              )
            } else if (coaching?.period_months) {
              const expiryDate = new Date()
              expiryDate.setMonth(expiryDate.getMonth() + coaching.period_months)
              expiresAt = expiryDate.toISOString()
              console.log(
                `checkout.session.completed [${session.id}]: coaching period_months=${coaching.period_months} → expires_at=${expiresAt}`
              )
            } else {
              console.warn(
                `checkout.session.completed [${session.id}]: coaching product ${coachingProductId} has no period_months set`
              )
            }
          }
        }

        // PostgREST cannot use partial unique indexes for ON CONFLICT, so we
        // do a manual check-then-update-or-insert instead of upsert.
        // When user_id is null, always insert (two purchases with no account are distinct rows).
        let enrollError: { message: string } | null = null
        let enrollmentId: number | null = null

        if (userId) {
          const { data: existing } = await supabase
            .from("enrollments")
            .select("id")
            .eq("offer_id", offerId)
            .eq("user_id", userId)
            .maybeSingle()

          if (existing) {
            const { error } = await supabase
              .from("enrollments")
              .update({
                buyer_email: buyerEmail,
                status: "active",
                stripe_customer_id: session.customer ?? null,
                stripe_subscription_id: session.subscription ?? null,
                expires_at: expiresAt,
                offer_variant_id: variantId,
              })
              .eq("id", existing.id)
            enrollError = error
            enrollmentId = existing.id
          } else {
            const { data: inserted, error } = await supabase
              .from("enrollments")
              .insert({
                organization_id: organizationId,
                offer_id: offerId,
                offer_variant_id: variantId,
                user_id: userId,
                buyer_email: buyerEmail,
                status: "active",
                stripe_customer_id: session.customer ?? null,
                stripe_subscription_id: session.subscription ?? null,
                expires_at: expiresAt,
              })
              .select("id")
              .single()
            enrollError = error
            enrollmentId = inserted?.id ?? null
          }
        } else {
          const { data: inserted, error } = await supabase
            .from("enrollments")
            .insert({
              organization_id: organizationId,
              offer_id: offerId,
              offer_variant_id: variantId,
              user_id: null,
              buyer_email: buyerEmail,
              status: "active",
              stripe_customer_id: session.customer ?? null,
              stripe_subscription_id: session.subscription ?? null,
              expires_at: expiresAt,
            })
            .select("id")
            .single()
          enrollError = error
          enrollmentId = inserted?.id ?? null
        }

        if (enrollError) {
          console.error(
            `Failed to create enrollment for offer ${offerId} / email "${buyerEmail}":`,
            enrollError.message
          )
        } else {
          console.log(
            `Enrollment created: offer ${offerId}, user ${userId ?? "pending"}, email "${buyerEmail}", expires ${expiresAt ?? "never"}`
          )
        }

        // Record sale for dashboard/revenue (price in units like offers table).
        if (enrollmentId != null && (session.amount_total ?? 0) > 0) {
          const { data: offer } = await supabase
            .from("offers")
            .select("billing_type")
            .eq("id", offerId)
            .single()

          const billingType = (offer?.billing_type as "one_time" | "subscription" | "installment") ?? "one_time"
          const price = (session.amount_total ?? 0) / 100
          const currency = (session.currency ?? "eur").toLowerCase()

          const { error: saleError } = await supabase.from("sales").insert({
            organization_id: organizationId,
            enrollment_id: enrollmentId,
            user_id: userId ?? null,
            buyer_email: buyerEmail,
            billing_type: billingType,
            price,
            currency,
            stripe_checkout_session_id: session.id,
          })

          if (saleError) {
            console.error(
              `Failed to insert sale for checkout ${session.id}:`,
              saleError.message
            )
          } else {
            console.log(`Sale recorded: checkout ${session.id}, amount ${price} ${currency}`)
          }
        }

        break
      }

      // ----------------------------------------------------------------
      // Subscription created — set cancel_at for installment plans
      // ----------------------------------------------------------------
      case "customer.subscription.created": {
        // current_period_start is on the subscription item, not the top level.
        // start_date / billing_cycle_anchor are equivalent and available at the top level.
        const subscription = event.data.object as {
          id: string
          metadata?: Record<string, string>
          start_date?: number
        }

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
          break
        }

        if (!cancelAfterCycles || cancelAfterCycles < 2) {
          console.warn(
            `customer.subscription.created [${subscription.id}]: is_installment=true but cancel_after_cycles=${cancelAfterCycles} — cannot set cancel_at`
          )
          break
        }

        if (!subscription.start_date) {
          console.warn(
            `customer.subscription.created [${subscription.id}]: missing start_date — cannot compute cancel_at`
          )
          break
        }

        const periodStartSec = subscription.start_date

        // Payment schedule:
        //   - Payment 1 happens at checkout when the subscription is created (start_date)
        //   - Payments 2..N happen at monthly renewals (+1, +2, … +(N-1) months)
        //   - cancel_at = start_date + N months prevents any (N+1)-th charge
        // cancel_after_cycles = total installment count (including the first checkout payment).
        // Use UTC month arithmetic to match Stripe's UTC-based billing cycle.
        // setMonth/getMonth are local-time methods and produce a 1-hour offset
        // when DST transitions occur between the start and cancel dates.
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
            { stripeAccount: event.account ?? undefined }
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

        // expires_at is intentionally NOT updated here — it is always driven by
        // the coaching product's period_months (set at checkout). The cancel_at above
        // only controls when Stripe stops billing; access duration is a separate concern.

        break
      }

      // ----------------------------------------------------------------
      // Subscription status changed (renewal, pause, reactivation…)
      // ----------------------------------------------------------------
      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id: string
          status: string
        }

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "paused",
          unpaid: "paused",
          canceled: "cancelled",
          paused: "paused",
        }

        const newStatus = statusMap[subscription.status]
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

        break
      }

      // ----------------------------------------------------------------
      // Subscription cancelled (end of period or immediate)
      // ----------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as {
          id: string
          metadata?: Record<string, string>
          start_date?: number
          ended_at?: number | null
          cancel_at?: number | null
          current_period_end?: number
        }

        let status: "expired" | "cancelled" = "cancelled"

        if (subscription.metadata?.is_installment === "true") {
          const cancelAfterCycles = subscription.metadata?.cancel_after_cycles
            ? parseInt(subscription.metadata.cancel_after_cycles, 10)
            : null
          const startDate = subscription.start_date

          if (cancelAfterCycles != null && startDate != null) {
            const expectedEndDate = new Date(startDate * 1000)
            expectedEndDate.setUTCMonth(
              expectedEndDate.getUTCMonth() + cancelAfterCycles
            )
            const expectedYear = expectedEndDate.getUTCFullYear()
            const expectedMonth = expectedEndDate.getUTCMonth()

            // Use ended_at or cancel_at (when the sub actually ended), not canceled_at (when cancellation was requested)
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
          console.log(
            `Enrollment for subscription ${subscription.id} updated to ${status}`
          )
        }

        break
      }

      // ----------------------------------------------------------------
      // Invoice paid — record subscription renewal in sales
      // ----------------------------------------------------------------
      case "invoice.paid": {
        const invoice = event.data.object as {
          id: string
          subscription?: string | null
          parent?: {
            subscription_details?: { subscription?: string } | null
          } | null
          amount_paid?: number
          currency?: string | null
          billing_reason?: string
        }

        const subscriptionId =
          invoice.subscription ??
          invoice.parent?.subscription_details?.subscription ??
          null

        if (!subscriptionId || invoice.billing_reason !== "subscription_cycle") {
          break
        }

        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id, organization_id, offer_id, user_id, buyer_email")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle()

        if (!enrollment || (invoice.amount_paid ?? 0) <= 0) {
          break
        }

        const price = (invoice.amount_paid ?? 0) / 100
        const currency = (invoice.currency ?? "eur").toLowerCase()

        const { error: saleError } = await supabase.from("sales").insert({
          organization_id: enrollment.organization_id,
          enrollment_id: enrollment.id,
          user_id: enrollment.user_id,
          buyer_email: enrollment.buyer_email,
          billing_type: "subscription",
          price,
          currency,
          stripe_invoice_id: invoice.id,
        })

        if (saleError) {
          console.error(`Failed to insert sale for invoice ${invoice.id}:`, saleError.message)
        } else {
          console.log(`Sale recorded: invoice ${invoice.id}, renewal amount ${price} ${currency}`)
        }

        break
      }

      // ----------------------------------------------------------------
      // Payment failed on renewal
      // ----------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as {
          id: string
          subscription?: string | null
        }

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

        break
      }

      default:
        // Acknowledge and ignore unhandled event types
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Unhandled webhook error for event "${event.type}":`, message)
    return NextResponse.json(
      { error: "Webhook handler failed", details: message },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}
