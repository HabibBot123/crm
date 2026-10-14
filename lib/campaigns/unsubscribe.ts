import { createHmac, timingSafeEqual } from "crypto"
import { z } from "zod"

const unsubscribePayloadSchema = z.object({
  v: z.literal(1),
  o: z.number().int().positive(),
  e: z.string().email(),
})

export type UnsubscribePayload = z.infer<typeof unsubscribePayloadSchema>

function getUnsubscribeSecret(): string {
  const dedicated = process.env.UNSUBSCRIBE_SECRET?.trim()
  if (dedicated) return dedicated
  const fallback = process.env.RESEND_API_KEY?.trim()
  if (fallback) return fallback
  throw new Error("UNSUBSCRIBE_SECRET is not configured")
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim() ||
    "http://localhost:3000"
  )
}

/** Resend contact property key (account-wide, scoped by org id). */
export function unsubscribeContactPropertyKey(organizationId: number): string {
  return `cs_unsub_${organizationId}`
}

export function createUnsubscribeToken(input: {
  organizationId: number
  email: string
}): string {
  const payload: UnsubscribePayload = {
    v: 1,
    o: input.organizationId,
    e: input.email.trim().toLowerCase(),
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", getUnsubscribeSecret())
    .update(body)
    .digest("base64url")
  return `${body}.${sig}`
}

export function verifyUnsubscribeToken(
  token: string
): UnsubscribePayload | null {
  const trimmed = token.trim()
  const dot = trimmed.lastIndexOf(".")
  if (dot <= 0 || dot === trimmed.length - 1) return null
  const body = trimmed.slice(0, dot)
  const sig = trimmed.slice(dot + 1)
  const expected = createHmac("sha256", getUnsubscribeSecret())
    .update(body)
    .digest("base64url")
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null
  }
  try {
    const json: unknown = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    )
    const parsed = unsubscribePayloadSchema.safeParse(json)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function buildUnsubscribePageUrl(
  token: string,
  campaignId?: number
): string {
  const url = new URL("/unsubscribe", getAppBaseUrl())
  url.searchParams.set("t", token)
  if (campaignId != null && campaignId > 0) {
    url.searchParams.set("c", String(campaignId))
  }
  return url.toString()
}

/**
 * Absolute URL template with Resend merge tag for the org-scoped token property.
 * `c` = campaign id baked into this broadcast HTML for attribution (not in the token).
 */
export function buildUnsubscribeMergeUrl(
  organizationId: number,
  campaignId: number
): string {
  const key = unsubscribeContactPropertyKey(organizationId)
  return `${getAppBaseUrl()}/unsubscribe?t={{{contact.${key}}}}&c=${campaignId}`
}

/** Rewrite `{{{UNSUBSCRIBE_URL}}}` to the CoachStack merge URL for broadcast. */
export function injectUnsubscribeMergeUrl(
  html: string,
  organizationId: number,
  campaignId: number
): string {
  const mergeUrl = buildUnsubscribeMergeUrl(organizationId, campaignId)
  return html.replace(/\{\{\{UNSUBSCRIBE_URL\}\}\}/g, mergeUrl)
}
