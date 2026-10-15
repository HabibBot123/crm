export function formatProductDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Badge status for a product line: delivery completed_at wins over active. */
export function deliveryStatus(
  enrollmentStatus: string,
  productCompletedAt: string | null | undefined
): string {
  if (
    enrollmentStatus === "expired" ||
    enrollmentStatus === "cancelled" ||
    enrollmentStatus === "paused"
  ) {
    return enrollmentStatus
  }
  if (productCompletedAt) return "completed"
  return "active"
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

/** Deep link to a purchased program line (enrollment product), not bare product_id. */
export function programHref(p: {
  product_type: string
  enrollment_product_id: number
}): string {
  if (p.product_type === "coaching") {
    return `/coaching/${p.enrollment_product_id}`
  }
  return `/courses/${p.enrollment_product_id}`
}

/** Active state for member org nav. */
export function isCoachedNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === "/home") return false
  return pathname.startsWith(`${href}/`)
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

/** Absolute URL for external links (meeting). Bare hosts like `test.fr` become relative otherwise. */
export function externalHref(url: string | null | undefined): string | null {
  if (url == null) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  return `https://${trimmed}`
}

