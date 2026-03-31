import type { OrganizationBranding } from "@/lib/services/organizations"

export const DEFAULT_BRANDING_STATS: NonNullable<OrganizationBranding["stats"]> = [
  { value: "120+", label: "Athletes coached" },
  { value: "4.9/5", label: "Average rating" },
  { value: "96%", label: "Satisfaction" },
]

export const DEFAULT_BRANDING_TESTIMONIALS: NonNullable<
  OrganizationBranding["testimonials"]
> = [
  { author: "Client A", role: "Amateur athlete", text: "Great coaching.", rating: 5 },
]

export const DEFAULT_BRANDING_FAQ: NonNullable<OrganizationBranding["faq"]> = [
  { question: "How do sessions work?", answer: "Sessions can be online or in-person." },
]

/** Flat shape used by the dashboard branding form (one place for defaults + merge). */
export type BrandingFormValues = {
  logoUrl: string | null
  heroImageUrl: string | null
  description: string
  bio: string
  credentials: NonNullable<OrganizationBranding["credentials"]>
  tagline: string
  ctaText: string
  offersSectionTitle: string
  footerCtaText: string
  primaryColor: string
  secondaryColor: string
  stats: NonNullable<OrganizationBranding["stats"]>
  testimonials: NonNullable<OrganizationBranding["testimonials"]>
  faq: NonNullable<OrganizationBranding["faq"]>
  visibleOfferIds: number[]
  featuredOfferId: number | null
}

export function brandingToFormValues(
  branding: OrganizationBranding | null | undefined
): BrandingFormValues {
  const b = branding ?? {}
  return {
    logoUrl: b.logo_url ?? null,
    heroImageUrl: b.hero_image_url ?? null,
    description: b.description ?? "",
    bio: b.bio ?? "",
    credentials: [...(b.credentials ?? [])],
    tagline: b.tagline ?? "",
    ctaText: b.cta_text ?? "See programs",
    offersSectionTitle: b.offers_section_title ?? "Choose your program",
    footerCtaText: b.footer_cta_text ?? "Ready to level up?",
    primaryColor: b.primary_color ?? "#e07b39",
    secondaryColor: b.secondary_color ?? "#111827",
    stats: b.stats ?? DEFAULT_BRANDING_STATS,
    testimonials: b.testimonials ?? DEFAULT_BRANDING_TESTIMONIALS,
    faq: b.faq ?? DEFAULT_BRANDING_FAQ,
    visibleOfferIds: [...(b.offers_display?.visible_offer_ids ?? [])],
    featuredOfferId: b.offers_display?.featured_offer_id ?? null,
  }
}
