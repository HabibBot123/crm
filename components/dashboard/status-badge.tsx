import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusVariant =
  | "success"
  | "info"
  | "warning"
  | "destructive"
  | "muted"
  | "default"

interface StatusConfig {
  label: string
  variant: StatusVariant
}

const defaultConfigs: Record<string, StatusConfig> = {
  active:    { label: "Active",    variant: "success"     },
  completed: { label: "Completed", variant: "info"        },
  published: { label: "Published", variant: "success"     },
  draft:     { label: "Draft",     variant: "warning"     },
  archived:  { label: "Archived",  variant: "muted"       },
  expired:   { label: "Expired",   variant: "muted"       },
  cancelled: { label: "Cancelled", variant: "destructive" },
  paused:    { label: "Paused",    variant: "warning"     },
  invited:   { label: "Invited",   variant: "warning"     },
  revoked:   { label: "Revoked",   variant: "destructive" },
  editable:  { label: "Editable",  variant: "warning"     },
  locked:    { label: "Locked",    variant: "muted"       },
}

const variantStyles: Record<StatusVariant, string> = {
  success:     "bg-success/10 text-success border-success/20",
  info:        "bg-info/10 text-info border-info/20",
  warning:     "bg-warning/10 text-warning-foreground border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  muted:       "bg-muted text-muted-foreground border-border",
  default:     "bg-primary/10 text-primary border-primary/20",
}

interface StatusBadgeProps {
  status: string
  configs?: Record<string, StatusConfig>
  className?: string
}

export function StatusBadge({ status, configs, className }: StatusBadgeProps) {
  const merged = configs ? { ...defaultConfigs, ...configs } : defaultConfigs
  const fallback: StatusConfig = { label: status, variant: "default" }
  const config = merged[status.toLowerCase()] ?? fallback
  return (
    <Badge
      variant="outline"
      className={cn("text-xs capitalize", variantStyles[config.variant], className)}
    >
      {config.label}
    </Badge>
  )
}
