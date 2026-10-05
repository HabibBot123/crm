import type { OrganizationBranding } from "@/lib/services/organizations"

/** Flat shape for the simplified storefront branding form. */
export type BrandingFormValues = {
  logoUrl: string | null
  bio: string
  primaryColor: string
}

export function brandingToFormValues(
  branding: OrganizationBranding | null | undefined
): BrandingFormValues {
  const b = branding ?? {}
  return {
    logoUrl: b.logo_url ?? null,
    bio: (b.bio ?? b.description ?? "").trim(),
    primaryColor: b.primary_color ?? "#e07b39",
  }
}
