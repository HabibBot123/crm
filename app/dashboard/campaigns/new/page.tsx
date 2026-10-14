"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { SectionCard } from "@/components/dashboard/section-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  CampaignEditorForm,
  type CampaignEditorFormValues,
} from "@/components/dashboard/campaigns/campaign-editor-form"
import { Button } from "@/components/ui/button"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useCampaignSegments } from "@/hooks/use-campaign-segments"
import { useCampaignEmailTemplates } from "@/hooks/use-campaign-email-templates"
import { useCreateCampaign } from "@/hooks/use-campaigns"
import { useSendingDomain } from "@/hooks/use-sending-domain"

const BACK_HREF = "/dashboard/campaigns"

export default function NewCampaignPage() {
  const router = useRouter()
  const { currentOrganization } = useCurrentOrganization()
  const organizationId = currentOrganization?.id ?? null
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManage = can("campaigns.manage")

  const { data: segments, isLoading: segmentsLoading } = useCampaignSegments(
    canManage ? organizationId : null
  )
  const { data: templates, isLoading: templatesLoading } =
    useCampaignEmailTemplates(canManage ? organizationId : null)
  const { domain } = useSendingDomain(canManage ? organizationId : null)
  const createCampaign = useCreateCampaign(organizationId)

  const domainReady = domain?.status === "verified"
  const defaultFromEmail =
    domain?.status === "verified" && domain.domain_name
      ? `hello@${domain.domain_name}`
      : ""
  const defaultFromName = currentOrganization?.name ?? ""

  async function handleSave(values: CampaignEditorFormValues) {
    const campaign = await createCampaign.mutateAsync({
      name: values.name,
      segment_id: values.segment_id,
      template_id: values.template_id,
      subject: values.subject,
      body_html: values.body_html,
      body_json: values.body_json,
      preview_text: values.preview_text || null,
      from_name: values.from_name,
      from_email: values.from_email,
      reply_to: values.reply_to || null,
    })
    router.push(`/dashboard/campaigns/${campaign.id}?section=email`)
  }

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to create campaigns.
        </p>
      </div>
    )
  }

  if (capsLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="New campaign" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (!canManage) {
    return (
      <NoAccessState
        title="New campaign"
        description="You don’t have permission to manage campaigns with your role."
      />
    )
  }

  if (segmentsLoading || templatesLoading || !organizationId) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="New campaign" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (!segments?.length) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="New campaign" back={BACK_HREF} />
        <EmptyState
          title="Create a segment first"
          description="Campaigns need a segment to target leads and clients."
          action={
            <Button type="button" asChild>
              <Link href="/dashboard/campaigns?tab=library&newSegment=1">
                <Plus />
                New segment
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="New campaign" back={BACK_HREF} />
      <CampaignEditorForm
        organizationId={organizationId}
        mode="create"
        segments={segments}
        templates={templates ?? []}
        defaultFromEmail={defaultFromEmail}
        defaultFromName={defaultFromName}
        domainReady={domainReady}
        hasSendingDomain={domain != null}
        editorKey="new"
        saving={createCampaign.isPending}
        onSave={handleSave}
      />
    </div>
  )
}
