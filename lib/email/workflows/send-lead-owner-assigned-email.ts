import { createElement } from "react"
import { sendEmail, type SendEmailError } from "../client"
import {
  LeadOwnerAssignedEmail,
  type LeadOwnerAssignedField,
} from "../templates/lead-owner-assigned"

export type SendLeadOwnerAssignedEmailParams = {
  to: string
  ownerName?: string | null
  assignerName?: string | null
  orgName?: string | null
  leadName: string
  leadEmail: string
  leadPhone?: string | null
  leadStatus: string
  formTitle?: string | null
  offerTitle?: string | null
  fields: LeadOwnerAssignedField[]
  leadUrl: string
}

export async function sendLeadOwnerAssignedEmail(
  params: SendLeadOwnerAssignedEmailParams
): Promise<{ error: SendEmailError | null }> {
  const { to, ...rest } = params

  return sendEmail({
    to,
    subject: rest.orgName
      ? `New lead assigned to you — ${rest.leadName} (${rest.orgName})`
      : `New lead assigned to you — ${rest.leadName}`,
    react: createElement(LeadOwnerAssignedEmail, rest),
  })
}
