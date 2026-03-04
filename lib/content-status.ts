export type ServerUploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed"
  | null
  | undefined

/**
 * Shared status → label/style mapping for content uploads
 *
 * States:
 * - Client-only: "idle" (local UI, not stored in DB)
 * - Server/DB:   "pending" → "uploading"/"uploaded" → "processing" → "ready" | "failed"
 */
export function getStatusBadgeStyle(statusRaw: ServerUploadStatus) {
  const status = (statusRaw ?? "—").toLowerCase()
  const label = status === "—" ? "Unknown" : status.replace(/_/g, " ")

  // Final ready state only: green
  if (status === "ready") {
    return {
      label,
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    }
  }

  // In‑flight states (including 'uploaded' from webhook): amber
  if (status === "processing" || status === "uploading" || status === "uploaded" || status === "pending") {
    return {
      label,
      className: "bg-amber-100 text-amber-800 border-amber-200",
    }
  }

  if (status === "failed") {
    return {
      label,
      className: "bg-destructive/10 text-destructive border-destructive/30",
    }
  }

  return {
    label,
    className: "bg-muted text-muted-foreground border-border",
  }
}

