export const OFFER_CURRENCIES = ["eur", "usd", "gbp", "chf"] as const
export type OfferCurrency = (typeof OFFER_CURRENCIES)[number]
