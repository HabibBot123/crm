import { notFound } from "next/navigation"
import { PublicFormView } from "@/components/public/form/public-form-view"
import { fetchPublicFormBySlug } from "@/lib/services/crm-forms"

type PageProps = {
  params: Promise<{ slug: string; formSlug: string }>
  searchParams: Promise<{ ref?: string }>
}

export default async function PublicOrgFormPage({ params, searchParams }: PageProps) {
  const { slug, formSlug } = await params
  const query = await searchParams

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const data = await fetchPublicFormBySlug(appUrl, slug, formSlug, query.ref?.trim() || null)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-6 md:py-12">
      <PublicFormView
        orgSlug={slug}
        formSlug={formSlug}
        refCode={query.ref?.trim() || null}
        organization={{
          name: data.organization.name,
          branding: data.organization.branding,
        }}
        form={data.form}
      />
    </div>
  )
}
