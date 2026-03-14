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

