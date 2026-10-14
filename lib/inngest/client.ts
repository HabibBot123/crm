import { Inngest } from "inngest"

export const inngest = new Inngest({ id: "coachstack" })

export const CAMPAIGN_CONTACT_SYNC_EVENT = "campaign/contact.sync" as const

export type CampaignContactSyncEvent = {
  name: typeof CAMPAIGN_CONTACT_SYNC_EVENT
  data: {
    organizationId: number
    email: string
  }
}
