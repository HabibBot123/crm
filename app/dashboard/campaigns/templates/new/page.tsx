"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import {
  TemplateEditorForm,
  type TemplateEditorFormValues,
} from "@/components/dashboard/campaigns/template-editor-form"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { useCreateCampaignEmailTemplate } from "@/hooks/use-campaign-email-templates"

const BACK_HREF = "/dashboard/campaigns"

export default function NewCampaignTemplatePage() {
  const router = useRouter()
  const { currentOrganization } = useCurrentOrganization()
  const organizationId = currentOrganization?.id ?? null
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canManage = can("campaigns.manage")
  const createTemplate = useCreateCampaignEmailTemplate(organizationId)

  async function handleSave(values: TemplateEditorFormValues) {
    const template = await createTemplate.mutateAsync(values)
    router.push(`/dashboard/campaigns/templates/${template.id}`)
  }

  if (!currentOrganization) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to create templates.
        </p>
      </div>
    )
  }

  if (capsLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <PageHeader title="New template" back={BACK_HREF} />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!canManage) {
    return (
      <NoAccessState
        title="New template"
        description="You don’t have permission to manage campaigns with your role."
      />
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="New template" back={BACK_HREF} />
      <TemplateEditorForm
        editorKey="new"
        saving={createTemplate.isPending}
        onSave={handleSave}
        onCancel={() => router.push(BACK_HREF)}
      />
    </div>
  )
}
