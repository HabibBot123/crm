import { notFound } from "next/navigation"
import { fetchPublicOrganizationBySlug } from "@/lib/services/organizations"
import { StorefrontView } from "@/components/storefront/storefront-view"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicOrganizationPage({ params }: PageProps) {
  const { slug } = await params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const data = await fetchPublicOrganizationBySlug(appUrl, slug)

  if (!data) {
    notFound()
  }

  const { organization, offers } = data
  const branding = organization.branding ?? {}
  const primaryColor = branding.primary_color || "#e07b39"
  const bio =
    branding.bio?.trim() ||
    branding.description?.trim() ||
    "Programs and coaching offers."

  return (
    <StorefrontView
      name={organization.name}
      logoUrl={branding.logo_url ?? null}
      bio={bio}
      primaryColor={primaryColor}
      offers={offers}
      buyHrefBase={`/org/${organization.slug}/buy`}
    />
  )
}
