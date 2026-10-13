import { Resend } from "resend"

/** Platform Resend client. Returns null when RESEND_API_KEY is unset (local/dev skip). */
export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}
