import { createElement } from "react"
import { sendEmail, type SendEmailError } from "../client"
import { WelcomeCoachEmail } from "../templates/welcome-coach"
import { WelcomeCoachedEmail } from "../templates/welcome-coached"

export type SignupSource = "coach" | "coached"

export type SendWelcomeEmailParams = {
  to: string
  signupSource: SignupSource
  fullName?: string | null
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<{
  error: SendEmailError | null
}> {
  const { to, signupSource, fullName } = params
  const subject = signupSource === "coach" ? "Welcome to CoachStack" : "You're in — CoachStack"
  const Component = signupSource === "coach" ? WelcomeCoachEmail : WelcomeCoachedEmail
  return sendEmail({
    to,
    subject,
    react: createElement(Component, { name: fullName ?? undefined }),
  })
}
