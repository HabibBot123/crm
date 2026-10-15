import type { User } from "@supabase/supabase-js"

export function formatAuthProvider(provider: string): string {
  const map: Record<string, string> = {
    email: "Email",
    google: "Google",
    github: "GitHub",
    apple: "Apple",
  }
  return map[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function authProvidersFromUser(user: User | null | undefined): {
  providers: string[]
  primaryProvider: string
  isEmailProvider: boolean
  signedInWithLabel: string
} {
  const primaryProvider =
    user?.app_metadata?.provider ??
    user?.identities?.[0]?.provider ??
    "email"
  const fromMeta = user?.app_metadata?.providers
  const providers: string[] =
    Array.isArray(fromMeta) && fromMeta.every((p) => typeof p === "string")
      ? fromMeta.filter(Boolean)
      : primaryProvider
        ? [primaryProvider]
        : []
  const isEmailProvider = providers.includes("email")
  const signedInWithLabel =
    providers.length > 0
      ? providers.map((p) => formatAuthProvider(p)).join(", ")
      : formatAuthProvider(primaryProvider)

  return {
    providers,
    primaryProvider,
    isEmailProvider,
    signedInWithLabel,
  }
}
