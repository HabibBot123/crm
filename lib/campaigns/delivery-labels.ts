export const RECIPIENT_STATUS_CONFIGS: Record<
  string,
  {
    label: string
    variant: "success" | "info" | "warning" | "destructive" | "muted" | "default"
  }
> = {
  queued: { label: "Queued", variant: "muted" },
  sent: { label: "Sent", variant: "muted" },
  delivered: { label: "Delivered", variant: "info" },
  opened: { label: "Opened", variant: "success" },
  clicked: { label: "Clicked", variant: "success" },
  bounced: { label: "Bounced", variant: "destructive" },
  complained: { label: "Complained", variant: "destructive" },
  delivery_delayed: { label: "Delayed", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
  suppressed: { label: "Suppressed", variant: "warning" },
  unsubscribed: { label: "Unsubscribed", variant: "destructive" },
}

export const CAMPAIGN_STATUS_CONFIGS: Record<
  string,
  {
    label: string
    variant: "success" | "warning" | "destructive" | "muted" | "default"
  }
> = {
  draft: { label: "Draft", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "default" },
  sending: { label: "Sending", variant: "warning" },
  sent: { label: "Sent", variant: "success" },
  canceled: { label: "Canceled", variant: "muted" },
}

export function formatDeliveryRate(
  count: number,
  base: number
): string | null {
  if (base <= 0) return null
  return `${Math.round((count / base) * 100)}%`
}

export function formatShortDateTime(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function escapeIlikeTerm(term: string): string {
  return term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/'/g, "''")
}
