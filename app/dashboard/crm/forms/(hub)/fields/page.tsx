"use client"

import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { CrmFieldsPanel } from "@/components/dashboard/crm/crm-fields-panel"

export default function CrmFormsFieldsPage() {
  const { currentOrganization } = useCurrentOrganization()

  if (!currentOrganization) {
    return <p className="text-sm text-muted-foreground">Select an organization to manage fields.</p>
  }

  return <CrmFieldsPanel organizationId={currentOrganization.id} />
}
