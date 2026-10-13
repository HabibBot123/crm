import type { ReactElement } from "react"
import { getResendClient } from "@/lib/resend"

const from = "CoachStack <hello@mail.coachstack.co>"

/** Error shape returned by Resend (plain object, not Error instance). */
export type SendEmailError = { message: string }

export type SendEmailOptions = {
  to: string
  subject: string
  react?: ReactElement
  html?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ error: SendEmailError | null }> {
  const resend = getResendClient()
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email send")
    return { error: null }
  }
  if (options.react !== undefined) {
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      react: options.react,
    })
    return { error: error ?? null }
  }
  if (options.html !== undefined) {
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    return { error: error ?? null }
  }
  return { error: { message: "sendEmail requires react or html" } }
}
