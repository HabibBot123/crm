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

/** Text colors on a solid brand background (#RGB / #RRGGBB, white, black). */
export function brandOnSurface(css: string) {
  const t = css.trim().toLowerCase()
  let r = 0
  let g = 0
  let b = 0
  if (t === "white") {
    r = g = b = 255
  } else if (t !== "black") {
    const h = t.startsWith("#") ? t.slice(1) : t
    if (h.length === 3 && /^[0-9a-f]{3}$/.test(h)) {
      r = parseInt(h[0] + h[0], 16)
      g = parseInt(h[1] + h[1], 16)
      b = parseInt(h[2] + h[2], 16)
    } else if (h.length === 6 && /^[0-9a-f]{6}$/.test(h)) {
      r = parseInt(h.slice(0, 2), 16)
      g = parseInt(h.slice(2, 4), 16)
      b = parseInt(h.slice(4, 6), 16)
    }
  }
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const isLight = L > 0.55
  return {
    isLight,
    fg: isLight ? "#111827" : "#ffffff",
    muted: isLight ? "rgba(17,24,39,0.62)" : "rgba(255,255,255,0.6)",
  }
}
