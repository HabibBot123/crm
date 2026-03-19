import { NextRequest } from "next/server"
import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { badRequest, serverError, ok } from "@/lib/api-helpers/api-response"
import { handleCheckoutSessionCompleted } from "./_lib/handlers/checkout-completed"
import { handleSubscriptionCreated } from "./_lib/handlers/subscription-created"
import { handleSubscriptionUpdated } from "./_lib/handlers/subscription-updated"
import { handleSubscriptionDeleted } from "./_lib/handlers/subscription-deleted"
import { handleInvoicePaid } from "./_lib/handlers/invoice-paid"
import { handleInvoicePaymentFailed } from "./_lib/handlers/invoice-payment-failed"

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_CONNECT_WEBHOOK_SECRET is not configured")
    return serverError("Webhook secret not configured")
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return badRequest("Missing stripe-signature header")
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Stripe webhook signature verification failed:", message)
    return badRequest("Invalid signature", message)
  }

  const supabase = createAdminClient()
  const stripeAccountId = typeof event.account === "string" ? event.account : undefined

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(supabase, event.data.object)
        break

      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, stripe, event.data.object, stripeAccountId)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object)
        break

      case "invoice.paid":
        await handleInvoicePaid(supabase, event.data.object, stripeAccountId)
        break

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(supabase, event.data.object)
        break

      default:
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Unhandled webhook error for event "${event.type}":`, message)
    return serverError("Webhook handler failed", message)
  }

  return ok({ received: true })
}
