import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"

export type InstallmentOfferParams = {
  billingType: string
  price: number | string
  currency: string
  interval?: string | null
  installmentCount?: number | null
  stripePriceId: string
  stripeProductId: string
}

export type PaymentLinkMetadata = {
  offer_id: string
  organization_id: string
  variant_id?: string
  [key: string]: string | undefined
}

/**
 * Builds Stripe `paymentLinks.create` options for a given offer billing type.
 *
 * For installment plans, an additional recurring price is created on the fly
 * under the existing Stripe product (to avoid creating a duplicate product).
 *
 * @returns The `paymentLinkOptions` ready to pass to `stripe.paymentLinks.create`
 *          and, for installment flows, the id of the newly created installment price.
 */
export async function buildPaymentLinkOptions(
  stripeAccountId: string,
  offer: InstallmentOfferParams,
  metadata: PaymentLinkMetadata,
  successUrl: string
): Promise<{
  options: Parameters<typeof stripe.paymentLinks.create>[0]
  installmentPriceId?: string
}> {
  const isInstallment =
    (offer.billingType === "installment" || offer.billingType === "one_time") &&
    offer.installmentCount != null &&
    offer.installmentCount > 1

  if (offer.billingType === "subscription") {
    const baseOptions: Parameters<typeof stripe.paymentLinks.create>[0] = {
      line_items: [{ price: offer.stripePriceId, quantity: 1 }],
      subscription_data: { metadata: metadata as Record<string, string> },
      metadata: metadata as Record<string, string>,
    }

    const options: Parameters<typeof stripe.paymentLinks.create>[0] = {
      ...baseOptions,
      after_completion: {
        type: "redirect",
        redirect: { url: successUrl },
      } as Stripe.PaymentLinkCreateParams.AfterCompletion,
    }

    return {
      options,
    }
  }

  if (isInstallment) {
    const installmentUnitAmount = Math.round(
      (Number(offer.price) / offer.installmentCount!) * 100
    )

    const installmentPrice = await stripe.prices.create(
      {
        unit_amount: installmentUnitAmount,
        currency: offer.currency,
        recurring: { interval: "month" },
        product: offer.stripeProductId,
        metadata: {
          ...metadata,
          installment_count: String(offer.installmentCount),
          is_installment: "true",
        } as Record<string, string>,
      },
      { stripeAccount: stripeAccountId }
    )

    const baseOptions: Parameters<typeof stripe.paymentLinks.create>[0] = {
      line_items: [{ price: installmentPrice.id, quantity: 1 }],
      subscription_data: {
        metadata: {
          ...metadata,
          cancel_after_cycles: String(offer.installmentCount),
          is_installment: "true",
        } as Record<string, string>,
      },
      metadata: metadata as Record<string, string>,
    }

    const options: Parameters<typeof stripe.paymentLinks.create>[0] = {
      ...baseOptions,
      after_completion: {
        type: "redirect",
        redirect: { url: successUrl },
      } as Stripe.PaymentLinkCreateParams.AfterCompletion,
    }

    return {
      installmentPriceId: installmentPrice.id,
      options,
    }
  }

  // one_time / single payment
  const baseOptions: Parameters<typeof stripe.paymentLinks.create>[0] = {
    line_items: [{ price: offer.stripePriceId, quantity: 1 }],
    metadata: metadata as Record<string, string>,
  }

  const options: Parameters<typeof stripe.paymentLinks.create>[0] = {
    ...baseOptions,
    after_completion: {
      type: "redirect",
      redirect: { url: successUrl },
    } as Stripe.PaymentLinkCreateParams.AfterCompletion,
  }

  return {
    options,
  }
}
