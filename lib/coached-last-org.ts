const STORAGE_KEY = "coachstack-last-coached-org-slug"

export function getLastCoachedOrgSlug(): string | null {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(STORAGE_KEY)
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function setLastCoachedOrgSlug(slug: string): void {
  if (typeof window === "undefined") return
  const trimmed = slug.trim()
  if (!trimmed) return
  localStorage.setItem(STORAGE_KEY, trimmed)
}

/**
 * Prefer localStorage last org if still available.
 * Single org → always that slug.
 * Multi + no valid last → null (show picker).
 */
export function resolveCoachedOrgSlug(
  availableSlugs: string[],
  preferred?: string | null
): string | null {
  if (availableSlugs.length === 0) return null
  if (preferred && availableSlugs.includes(preferred)) return preferred
  const stored = getLastCoachedOrgSlug()
  if (stored && availableSlugs.includes(stored)) return stored
  if (availableSlugs.length === 1) return availableSlugs[0]
  return null
}
