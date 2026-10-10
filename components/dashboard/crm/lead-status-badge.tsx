import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrganizationLeadStatus } from "@/schemas/crm.schema"

function resolveStatusMeta(
  status: string,
  catalog?: OrganizationLeadStatus[]
): { label: string; color: string | null } {
  const fromCatalog = catalog?.find((item) => item.key === status)
  if (fromCatalog) {
    return { label: fromCatalog.label, color: fromCatalog.color }
  }
  if (status === "new") return { label: "New", color: "#3B82F6" }
  if (status === "lost") return { label: "Lost", color: "#EF4444" }
  if (status === "converted") return { label: "Converted", color: "#22C55E" }
  return { label: status, color: null }
}

export function LeadStatusBadge({
  status,
  catalog,
  className,
}: {
  status: string
  catalog?: OrganizationLeadStatus[]
  className?: string
}) {
  const { label, color } = resolveStatusMeta(status, catalog)

  if (color) {
    return (
      <Badge
        variant="outline"
        className={cn("border text-xs font-medium", className)}
        style={{
          backgroundColor: `${color}1a`,
          borderColor: `${color}33`,
          color,
        }}
      >
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {label}
    </Badge>
  )
}
