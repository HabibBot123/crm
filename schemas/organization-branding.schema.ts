import { z } from "zod"
import type { OrganizationBranding } from "@/lib/services/organizations"

const credentialSchema = z.object({
  icon: z.string(),
  text: z.string(),
})

const offersDisplaySchema = z.object({
  visible_offer_ids: z.array(z.number()),
  featured_offer_id: z.number().nullable(),
})

export const organizationBrandingSchema = z.object({
  logo_url: z.string().nullable().optional(),
  hero_image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  credentials: z.array(credentialSchema).nullable().optional(),
  primary_color: z.string().nullable().optional(),
  secondary_color: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  cta_text: z.string().nullable().optional(),
  offers_section_title: z.string().nullable().optional(),
  footer_cta_text: z.string().nullable().optional(),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).nullable().optional(),
  testimonials: z
    .array(
      z.object({
        author: z.string(),
        role: z.string().nullable().optional(),
        text: z.string(),
        rating: z.number().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .nullable()
    .optional(),
  offers_display: offersDisplaySchema.nullable().optional(),
})

export function parseOrganizationBrandingJson(raw: unknown): OrganizationBranding {
  const parsed = organizationBrandingSchema.safeParse(raw)
  if (!parsed.success) {
    return {}
  }
  return parsed.data
}
