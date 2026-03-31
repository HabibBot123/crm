export function formatProductDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function productTypeLabel(type: string): string {
  return type === "coaching" ? "Coaching" : "Course"
}

/** Theme tokens for product-type pills (same outline + /10 bg pattern as StatusBadge). */
export function productTypeBadgeClassName(type: string): string {
  if (type === "coaching") {
    return "border-primary/20 bg-primary/10 text-primary"
  }
  return "border-chart-3/20 bg-chart-3/10 text-chart-3"
}

export function formatSessionDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

