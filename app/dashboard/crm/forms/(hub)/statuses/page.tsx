"use client"

import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { CrmStatusesPanel } from "@/components/dashboard/crm/crm-statuses-panel"

export default function CrmFormsStatusesPage() {
  const { currentOrganization } = useCurrentOrganization()

  if (!currentOrganization) {
    return (
      <p className="text-sm text-muted-foreground">Select an organization to manage statuses.</p>
    )
  }

  return <CrmStatusesPanel organizationId={currentOrganization.id} />
}
