import { StatusBadge } from "@/components/dashboard/status-badge"
import type { LeadStatus } from "@/schemas/crm.schema"

export function LeadStatusBadge({ status }: { status: LeadStatus | string }) {
  return (
    <StatusBadge
      status={status}
      configs={{
        new: { label: "New", variant: "default" },
        booked: { label: "Booked", variant: "warning" },
        deadline: { label: "Deadline", variant: "warning" },
        converted: { label: "Converted", variant: "success" },
        failed: { label: "Failed", variant: "destructive" },
        contact_later: { label: "Contact later", variant: "muted" },
      }}
    />
  )
}
