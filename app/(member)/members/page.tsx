"use client"

import { Users } from "lucide-react"
import { EmptyState } from "@/components/dashboard/empty-state"

export default function OrgMembersAdminPage() {
  return (
    <EmptyState
      icon={Users}
      title="Moved to dashboard"
      description="Organization members are managed in Dashboard → Community → Members."
    />
  )
}
