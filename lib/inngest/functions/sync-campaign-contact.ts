import { createAdminClient } from "@/lib/supabase/admin"
import { syncCampaignContactToResend } from "@/lib/services/campaign-contacts"
import {
  CAMPAIGN_CONTACT_SYNC_EVENT,
  inngest,
} from "@/lib/inngest/client"

export const syncCampaignContactFunction = inngest.createFunction(
  {
    id: "sync-campaign-contact",
    triggers: [{ event: CAMPAIGN_CONTACT_SYNC_EVENT }],
    concurrency: [
      {
        limit: 5,
        key: "event.data.organizationId",
      },
    ],
    retries: 3,
  },
  async ({ event, step }) => {
    const organizationId = Number(event.data.organizationId)
    const email =
      typeof event.data.email === "string"
        ? event.data.email.trim().toLowerCase()
        : ""
    if (!Number.isFinite(organizationId) || organizationId <= 0 || !email) {
      return { ok: false, reason: "invalid_payload" }
    }

    const result = await step.run("sync-to-resend", async () => {
      const supabase = createAdminClient()
      return syncCampaignContactToResend(supabase, {
        organizationId,
        email,
      })
    })

    return {
      ok: result.resendContactId != null,
      resendContactId: result.resendContactId,
    }
  }
)
