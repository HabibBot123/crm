"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { SectionCard } from "@/components/dashboard/section-card"
import {
  CampaignEditorForm,
  type CampaignEditorFormValues,
  type CampaignEditorSection,
} from "@/components/dashboard/campaigns/campaign-editor-form"
import { CampaignDeliveryView } from "@/components/dashboard/campaigns/campaign-delivery-view"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { CAMPAIGN_STATUS_CONFIGS } from "@/lib/campaigns/delivery-labels"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useCampaignSegments } from "@/hooks/use-campaign-segments"
import { useCampaignEmailTemplates } from "@/hooks/use-campaign-email-templates"
import {
  useCampaign,
  useSendCampaign,
  useTestSendCampaign,
  useUpdateCampaign,
} from "@/hooks/use-campaigns"
import { useSendingDomain } from "@/hooks/use-sending-domain"

const BACK_HREF = "/dashboard/campaigns"

function isCampaignSection(value: string | null): value is CampaignEditorSection {
  return (
    value === "details" ||
    value === "email" ||
    value === "recipients" ||
    value === "send"
  )
}

export default function EditCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ campaignId: string }>()
  const campaignId = Number(params.campaignId)
  const validCampaignId = Number.isFinite(campaignId) && campaignId > 0
  const sectionParam = searchParams.get("section")
  const initialSection = isCampaignSection(sectionParam)
    ? sectionParam
    : "details"

  const { currentOrganization } = useCurrentOrganization()
  const organizationId = currentOrganization?.id ?? null
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManage = can("campaigns.manage")

  const {
    data: campaign,
    isLoading: campaignLoading,
    error,
  } = useCampaign(
    canManage && validCampaignId ? organizationId : null,
    validCampaignId ? campaignId : null
  )
  const { data: segments, isLoading: segmentsLoading } = useCampaignSegments(
    canManage ? organizationId : null
  )
  const { data: templates, isLoading: templatesLoading } =
    useCampaignEmailTemplates(canManage ? organizationId : null)
  const { domain } = useSendingDomain(canManage ? organizationId : null)

  const updateCampaign = useUpdateCampaign(organizationId)
  const sendCampaign = useSendCampaign(organizationId)
  const testSendCampaign = useTestSendCampaign(organizationId)

  const domainReady = domain?.status === "verified"
  const defaultFromEmail =
    domain?.status === "verified" && domain.domain_name
      ? `hello@${domain.domain_name}`
      : ""
  const defaultFromName = currentOrganization?.name ?? ""

  async function persist(values: CampaignEditorFormValues) {
    await updateCampaign.mutateAsync({
      campaignId,
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
  }

  async function handleSave(values: CampaignEditorFormValues) {
    await persist(values)
  }

  async function handleTestSend(to: string, values: CampaignEditorFormValues) {
    await persist(values)
    await testSendCampaign.mutateAsync({ campaignId, to })
  }

  async function handleSend(
    values: CampaignEditorFormValues,
    scheduledAt: string | null
  ) {
    await persist(values)
    await sendCampaign.mutateAsync({
      campaignId,
      scheduled_at: scheduledAt,
    })
    router.push(BACK_HREF)
  }

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to edit campaigns.
        </p>
      </div>
    )
  }

  if (capsLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit campaign" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (!canManage) {
    return (
      <NoAccessState
        title="Edit campaign"
        description="You don’t have permission to manage campaigns with your role."
      />
    )
  }

  if (!validCampaignId) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit campaign" back={BACK_HREF} />
        <SectionCard>
          <p className="text-sm text-destructive">Invalid campaign id</p>
        </SectionCard>
      </div>
    )
  }

  if (
    campaignLoading ||
    segmentsLoading ||
    templatesLoading ||
    !organizationId
  ) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit campaign" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (error || !campaign || !segments) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit campaign" back={BACK_HREF} />
        <SectionCard>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Campaign not found"}
          </p>
        </SectionCard>
      </div>
    )
  }

  if (campaign.status === "sent") {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader
          title={campaign.name}
          back={BACK_HREF}
          titleAside={
            <StatusBadge
              status={campaign.status}
              configs={CAMPAIGN_STATUS_CONFIGS}
            />
          }
        />
        <CampaignDeliveryView
          organizationId={organizationId}
          campaignId={campaign.id}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Edit campaign"
        subtitle={`${campaign.name} · ${campaign.status}`}
        back={BACK_HREF}
      />
      <CampaignEditorForm
        key={campaign.id}
        organizationId={organizationId}
        mode="edit"
        campaign={campaign}
        segments={segments}
        templates={templates ?? []}
        defaultFromEmail={defaultFromEmail}
        defaultFromName={defaultFromName}
        domainReady={domainReady}
        hasSendingDomain={domain != null}
        editorKey={String(campaign.id)}
        initialSection={initialSection}
        saving={updateCampaign.isPending}
        sending={sendCampaign.isPending}
        testing={testSendCampaign.isPending}
        onSave={handleSave}
        onTestSend={handleTestSend}
        onSend={handleSend}
        onSectionChange={(next) => {
          const paramsNext = new URLSearchParams(searchParams.toString())
          paramsNext.set("section", next)
          router.replace(
            `/dashboard/campaigns/${campaign.id}?${paramsNext.toString()}`,
            { scroll: false }
          )
        }}
      />
    </div>
  )
}
