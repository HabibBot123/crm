import { Resend } from "resend"
import type { ReactElement } from "react"

const apiKey = process.env.RESEND_API_KEY
const from = "CoachStack <hello@coachstack.co>"

function getClient(): Resend | null {
  if (!apiKey) return null
  return new Resend(apiKey)
}

/** Error shape returned by Resend (plain object, not Error instance). */
export type SendEmailError = { message: string }

export type SendEmailOptions = {
  to: string
  subject: string
  react?: ReactElement
  html?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ error: SendEmailError | null }> {
  const resend = getClient()
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email send")
    return { error: null }
  }
  const hasBody = options.react !== undefined || options.html !== undefined
  if (!hasBody) {
    return { error: { message: "sendEmail requires react or html" } }
  }
  const payload = {
    from,
    to: options.to,
    subject: options.subject,
    ...(options.react !== undefined && { react: options.react }),
    ...(options.html !== undefined && { html: options.html }),
  }
  const { error } = await resend.emails.send(payload as Parameters<Resend["emails"]["send"]>[0])
  return { error: error ?? null }
}
