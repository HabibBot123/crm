import type { LeadStatusLog, OrganizationLeadStatus } from "@/schemas/crm.schema"
import { LeadStatusBadge } from "@/components/dashboard/crm/lead-status-badge"

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function LeadTimeline({
  rows,
  catalog,
}: {
  rows: LeadStatusLog[]
  catalog?: OrganizationLeadStatus[]
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No status changes yet.</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {row.from_status ? (
                <>
                  <LeadStatusBadge status={row.from_status} catalog={catalog} />
                  <span className="text-xs text-muted-foreground">to</span>
                </>
              ) : null}
              <LeadStatusBadge status={row.to_status} catalog={catalog} />
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
          </div>
          {row.note ? <p className="mt-2 text-xs text-foreground">{row.note}</p> : null}
        </li>
      ))}
    </ul>
  )
}
