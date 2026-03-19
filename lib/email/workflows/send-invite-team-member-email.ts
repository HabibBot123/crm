import { createElement } from "react"
import { sendEmail, type SendEmailError } from "../client"
import { InviteTeamMemberEmail } from "../templates/invite-team-member"

export type SendInviteTeamMemberEmailParams = {
  to: string
  inviterName?: string | null
  orgName?: string | null
  acceptUrl: string
}

export async function sendInviteTeamMemberEmail(
  params: SendInviteTeamMemberEmailParams
): Promise<{ error: SendEmailError | null }> {
  const { to, inviterName, orgName, acceptUrl } = params

  return sendEmail({
    to,
    subject: orgName ? `Invitation to join ${orgName} on CoachStack` : "You’re invited to join a CoachStack team",
    react: createElement(InviteTeamMemberEmail, {
      inviterName,
      orgName,
      acceptUrl,
    }),
  })
}

