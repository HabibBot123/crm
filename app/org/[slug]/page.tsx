import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getPublicOrganizationData,
  type OrganizationBranding,
} from "@/lib/services/organizations"
import type { BillingType } from "@/lib/services/offers"
import { formatAmountFromCents } from "@/lib/utils"

type PageProps = {
  params: { slug: string }
}

export default async function PublicOrganizationPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminClient()
  const data = await getPublicOrganizationData(supabase, slug)

  if (!data) {
    notFound()
  }

  const { organization, offers } = data
  const branding = organization.branding ?? {}

  const primaryColor = branding.primary_color || "#3b82f6"
  const description =
    branding.description || "Discover our latest offers and programs."

  const formatBillingType = (billingType: BillingType): string => {
    switch (billingType) {
      case "subscription":
        return "Subscription"
      case "one_time":
        return "One-time payment"
      case "installment":
        return "Installment plan"
      default:
        return "Offer"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
        {/* Header */}
        <section className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-xl font-bold text-muted-foreground">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo_url}
                  alt={organization.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                organization.name
                  .split(" ")
                  .map((n) => n[0]?.toUpperCase())
                  .join("")
                  .slice(0, 2)
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {organization.name}
              </h1>
            </div>
          </div>
        </section>

        {/* Hero / description */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div
            className="h-8 w-full"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="space-y-4 px-6 pb-6 pt-5 md:px-8 md:pb-8">
            <p className="text-base text-neutral-800 dark:text-neutral-200 whitespace-pre-line">
              {description}
            </p>
          </div>
        </section>

        {/* Offers */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">Offers</h2>
            {offers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Choose an offer to complete your purchase on a secure Stripe checkout page.
              </p>
            )}
          </div>
          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No offers are currently available.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {offers.map((offer) => (
                <article
                  key={offer.id}
                  className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {offer.title}
                    </h3>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {formatBillingType(offer.billing_type)}
                    </p>
                    {offer.description && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                        {offer.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p
                        className="text-xl font-bold"
                        style={{ color: primaryColor }}
                      >
                        {formatAmountFromCents(offer.price, offer.currency) ?? "—"}
                        {offer.interval === "month" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            / month
                          </span>
                        )}
                        {offer.interval === "year" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            / year
                          </span>
                        )}
                      </p>
                    </div>
                    <a
                      href={`/buy/${offer.id}`}
                      className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 md:px-6"
                      style={{ backgroundColor: primaryColor, color: "#ffffff" }}
                    >
                      Buy now
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

