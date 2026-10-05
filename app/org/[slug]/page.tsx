import { notFound } from "next/navigation"
import {
  fetchPublicOrganizationBySlug,
  type PublicOrgOffer,
} from "@/lib/services/organizations"
import { brandOnSurface, formatAmountFromCents } from "@/lib/utils"
import { Check } from "lucide-react"

type PageProps = {
  params: Promise<{ slug: string }>
}

function billingLine(offer: PublicOrgOffer) {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Annual" : "Monthly"
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${offer.installment_count}× installments`
  }
  return "One-time"
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
  const onPrimary = brandOnSurface(primaryColor)
  const bio =
    branding.bio?.trim() ||
    branding.description?.trim() ||
    "Programs and coaching offers."

  const initials = organization.name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg px-4 py-10 md:py-14">
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-lg font-bold">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={organization.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span style={{ color: primaryColor }}>{initials}</span>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {organization.name}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {bio}
          </p>
        </header>

        <section id="offers" className="space-y-3">
          {offers.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No offers available yet.
            </p>
          ) : (
            offers.map((offer) => (
              <article
                key={offer.id}
                className="rounded-xl border border-border bg-card p-5 transition hover:bg-accent/40"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {billingLine(offer)}
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                  {offer.title}
                </h2>
                {offer.description && (
                  <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                    {offer.description}
                  </p>
                )}
                {offer.key_features && offer.key_features.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {offer.key_features.slice(0, 4).map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          style={{ color: primaryColor }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p
                    className="font-display text-xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {formatAmountFromCents(offer.price, offer.currency) ?? "—"}
                    {offer.interval === "month" && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / mo
                      </span>
                    )}
                    {offer.interval === "year" && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / yr
                      </span>
                    )}
                  </p>
                  <a
                    href={`/org/${organization.slug}/buy/${offer.id}`}
                    className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ background: primaryColor, color: onPrimary.fg }}
                  >
                    Buy
                  </a>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  )
}
