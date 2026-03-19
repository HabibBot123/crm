import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_SYMBOLS: Record<
  string,
  { symbol: string; position: "before" | "after" }
> = {
  USD: { symbol: "$", position: "before" },
  GBP: { symbol: "£", position: "before" },
  JPY: { symbol: "¥", position: "before" },
  CNY: { symbol: "¥", position: "before" },
  EUR: { symbol: "€", position: "after" },
  CHF: { symbol: "CHF", position: "before" },
}

export function formatAmountFromCents(
  amountInCents: number | null | undefined,
  currency?: string
) {
  if (amountInCents == null || Number.isNaN(amountInCents)) return null

  const value = amountInCents / 100
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (!currency) return formatted

  const code = currency.toUpperCase()
  const config = CURRENCY_SYMBOLS[code]
  if (config) {
    return config.position === "before"
      ? `${config.symbol}${formatted}`
      : `${formatted}${config.symbol}`
  }
  return `${formatted} ${code}`
}

export function buildOrgUrl(appUrl: string | undefined, slug: string): string {
  if (!slug) return ""

  if (!appUrl) {
    return `https://${slug}.localhost:3000/`
  }

  return appUrl.replace("://", `://${slug}.`)
}
