"use client"

import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { CrmBusinessUnitsPanel } from "@/components/dashboard/crm/crm-business-units-panel"
import { TeamPlanGate } from "@/components/dashboard/team-plan-gate"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"

export default function CrmFormsBusinessUnitsPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { mode: orgMode } = useOrgCapabilities()

  if (!currentOrganization) {
    return (
      <p className="text-sm text-muted-foreground">Select an organization to manage business units.</p>
    )
  }

  if (orgMode.requiresTeamPlan) {
    return (
      <TeamPlanGate
        title="Business units are a Team feature"
        description="This option is for when you have a team or multiple branches and need to split reporting and commissions by unit."
      />
    )
  }

  return <CrmBusinessUnitsPanel organizationId={currentOrganization.id} />
}
