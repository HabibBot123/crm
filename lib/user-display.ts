/** Safe string from JSON / metadata without type assertions. */
export function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function displayNameFromUser(user: {
  user_metadata?: Record<string, unknown> | null
  email?: string | null
} | null): string | null {
  if (!user) return null
  const meta = user.user_metadata
  return (
    readOptionalString(meta?.full_name) ??
    readOptionalString(meta?.name) ??
    readOptionalString(user.email?.split("@")[0])
  )
}
