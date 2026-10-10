"use client"

import { PageHeader } from "@/components/dashboard/page-header"
import { CrmFormsHubNav } from "@/components/dashboard/crm/crm-forms-hub-nav"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"

export default function CrmFormsHubLayout({ children }: { children: React.ReactNode }) {
  const { can, isLoading: capsLoading } = useOrgCapabilities()
  const canAccessForms =
    can("forms.view") ||
    can("forms.manage") ||
    can("forms.links.view_own") ||
    can("forms.links.manage_others")

  if (!capsLoading && !canAccessForms) {
    return (
      <NoAccessState
        title="Forms"
        description="You don’t have permission to view forms or share links with your role."
      />
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Forms" subtitle="Forms, fields, statuses, and share links." />
      <div className="flex gap-8">
        <CrmFormsHubNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
