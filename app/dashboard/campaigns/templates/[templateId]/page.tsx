"use client"

import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import {
  TemplateEditorForm,
  type TemplateEditorFormValues,
} from "@/components/dashboard/campaigns/template-editor-form"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useCampaignEmailTemplate,
  useUpdateCampaignEmailTemplate,
} from "@/hooks/use-campaign-email-templates"

const BACK_HREF = "/dashboard/campaigns"

export default function EditCampaignTemplatePage() {
  const router = useRouter()
  const params = useParams<{ templateId: string }>()
  const templateId = Number(params.templateId)
  const validTemplateId = Number.isFinite(templateId) && templateId > 0

  const { currentOrganization } = useCurrentOrganization()
  const organizationId = currentOrganization?.id ?? null
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManage = can("campaigns.manage")

  const {
    data: template,
    isLoading: templateLoading,
    error,
  } = useCampaignEmailTemplate(
    canManage && validTemplateId ? organizationId : null,
    validTemplateId ? templateId : null
  )
  const updateTemplate = useUpdateCampaignEmailTemplate(organizationId)

  async function handleSave(values: TemplateEditorFormValues) {
    if (!validTemplateId) return
    await updateTemplate.mutateAsync({
      templateId,
      ...values,
    })
  }

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to edit templates.
        </p>
      </div>
    )
  }

  if (capsLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit template" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (!canManage) {
    return (
      <NoAccessState
        title="Edit template"
        description="You don’t have permission to manage campaigns with your role."
      />
    )
  }

  if (!validTemplateId) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit template" back={BACK_HREF} />
        <SectionCard>
          <p className="text-sm text-destructive">Invalid template id</p>
        </SectionCard>
      </div>
    )
  }

  if (templateLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit template" back={BACK_HREF} />
        <SectionCard>
          <LoadingRows count={4} />
        </SectionCard>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="Edit template" back={BACK_HREF} />
        <SectionCard>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Template not found"}
          </p>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Edit template" subtitle={template.name} back={BACK_HREF} />
      <TemplateEditorForm
        key={template.id}
        editorKey={String(template.id)}
        initialName={template.name}
        initialSubject={template.subject}
        initialBodyHtml={template.body_html}
        initialBodyJson={template.body_json}
        saving={updateTemplate.isPending}
        onSave={handleSave}
        onCancel={() => router.push(BACK_HREF)}
      />
    </div>
  )
}
