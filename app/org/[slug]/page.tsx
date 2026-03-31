import { notFound } from "next/navigation"
import {
  fetchPublicOrganizationBySlug,
  type PublicOrgOffer,
} from "@/lib/services/organizations"
import type { BillingType } from "@/lib/services/offers"
import { brandOnSurface, formatAmountFromCents } from "@/lib/utils"
import { Check } from "lucide-react"

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
  const secondaryColor = branding.secondary_color || "#111827"
  const onPrimary = brandOnSurface(primaryColor)
  const onSecondary = brandOnSurface(secondaryColor)
  const statValueColor =
    onSecondary.isLight && onPrimary.isLight ? "#111827" : primaryColor
  const description = branding.description || "Discover our latest offers and programs."
  const featuredOfferIdRaw = branding.offers_display?.featured_offer_id ?? null
  const featuredOfferId =
    featuredOfferIdRaw != null && offers.some((o) => o.id === featuredOfferIdRaw)
      ? featuredOfferIdRaw
      : null

  const hasAboutSection =
    Boolean(branding.bio?.trim()) ||
    (branding.credentials != null && branding.credentials.length > 0)

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

  const billingLine = (offer: PublicOrgOffer) => {
    if (offer.billing_type === "subscription") {
      return offer.interval === "year" ? "Annual subscription" : "Monthly subscription"
    }
    if (offer.billing_type === "installment" && offer.installment_count) {
      return `${offer.installment_count}× installments`
    }
    return "One-time payment"
  }

  const initials = organization.name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">

            <span className="font-display text-sm font-semibold text-foreground">
              {organization.name}
            </span>
          </div>
          <a
            href="#offers"
            className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ background: primaryColor, color: onPrimary.fg }}
          >
            {branding.cta_text ?? "See programs"}
          </a>
        </div>
      </header>

      <main className="space-y-0">
        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pt-8 pb-4 md:grid-cols-2 md:items-center md:gap-8 md:px-6 md:pt-12 md:pb-7">
          <div>
            {branding.tagline && (
              <span
                className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest"
                style={{ background: `${primaryColor}1a`, color: primaryColor }}
              >
                {branding.tagline}
              </span>
            )}
            <h1 className="font-display mb-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">
              {organization.name}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line md:text-[15px]">
              {description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="#offers"
                className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ background: primaryColor, color: onPrimary.fg }}
              >
                {branding.cta_text ?? "See programs"}
              </a>
              {hasAboutSection && (
                <a
                  href="#about"
                  className="rounded-lg border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-accent/60"
                >
                  Learn more
                </a>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            {branding.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.hero_image_url}
                alt={organization.name}
                className="w-full rounded-xl object-cover shadow-md"
                style={{ aspectRatio: "3/2" }}
              />
            ) : (
              <div
                className="flex w-full items-center justify-center rounded-xl text-5xl opacity-10 shadow-inner"
                style={{ aspectRatio: "3/2", background: `${primaryColor}14` }}
              >
                🏃
              </div>
            )}
          </div>
        </section>

        {branding.stats && branding.stats.length > 0 && (
          <section
            className="-mt-2 pt-5 pb-8 md:-mt-3 md:pt-6 md:pb-8"
            style={{ background: secondaryColor }}
          >
            <div className="mx-auto flex max-w-6xl flex-wrap justify-around gap-6 px-4 md:px-6">
              {branding.stats.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="font-display text-3xl font-extrabold" style={{ color: statValueColor }}>
                    {s.value}
                  </p>
                  <p className="text-xs" style={{ color: onSecondary.muted }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="offers" className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
              Programs
            </p>
            <h2 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-foreground">
              {branding.offers_section_title ?? "Offers"}
            </h2>
          </div>

          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No offers are currently available.
            </p>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => {
                const featured = featuredOfferId === offer.id
                return (
                  <article
                    key={offer.id}
                    className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ borderColor: featured ? primaryColor : undefined }}
                  >
                    {featured && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[11px] font-bold"
                        style={{ background: primaryColor, color: onPrimary.fg }}
                      >
                        Featured
                      </div>
                    )}
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {billingLine(offer)}
                    </p>
                    <h3 className="font-display mb-2 text-xl font-bold text-foreground">{offer.title}</h3>
                    {offer.description && (
                      <p className="mb-5 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {offer.description}
                      </p>
                    )}
                    {offer.key_features && offer.key_features.length > 0 && (
                      <ul className="mb-5 flex flex-col gap-2">
                        {offer.key_features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {offer.products.length > 0 && (
                      <div className="mb-5 flex flex-wrap gap-2">
                        {offer.products.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                            style={{ background: `${primaryColor}14`, color: primaryColor }}
                          >
                            {p.type === "course" ? "📖" : "🎯"} {p.title}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-5">
                      <div
                        className="font-display mb-4 text-3xl font-extrabold"
                        style={{ color: primaryColor }}
                      >
                        {formatAmountFromCents(offer.price, offer.currency) ?? "—"}
                        {offer.interval === "month" && (
                          <span className="text-sm font-normal text-muted-foreground"> / month</span>
                        )}
                        {offer.interval === "year" && (
                          <span className="text-sm font-normal text-muted-foreground"> / year</span>
                        )}
                        {offer.billing_type === "installment" && offer.installment_count && (
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            × {offer.installment_count}
                          </span>
                        )}
                      </div>
                      <a
                        href={`/org/${organization.slug}/buy/${offer.id}`}
                        className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:opacity-90"
                        style={
                          featured
                            ? { background: primaryColor, color: onPrimary.fg }
                            : {
                                border: `1.5px solid ${primaryColor}`,
                                color: primaryColor,
                                backgroundColor: "transparent",
                              }
                        }
                      >
                        Get started →
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {hasAboutSection && (
          <section id="about" className="bg-muted/40 py-14 md:py-16">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-center md:gap-10 md:px-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
              <div
                className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-muted md:mx-0"
                style={{ aspectRatio: "1" }}
              >
                {branding.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-6xl opacity-[0.12]"
                    style={{ background: `${primaryColor}14` }}
                  >
                    👤
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
                  About
                </p>
                <h2 className="font-display mt-2 mb-4 text-3xl font-extrabold tracking-tight text-foreground">
                  {organization.name}
                </h2>
                {!branding.logo_url && (
                  <div className="mb-5">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-xs font-bold">
                      {initials}
                    </div>
                  </div>
                )}
                {branding.bio?.trim() && (
                  <p className="mb-8 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                    {branding.bio.trim()}
                  </p>
                )}
                {branding.credentials && branding.credentials.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {branding.credentials.map((c, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                          style={{ background: `${primaryColor}14` }}
                        >
                          {c.icon || "•"}
                        </span>
                        <span className="text-foreground">{c.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {branding.testimonials && branding.testimonials.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
              Testimonials
            </p>
            <h2 className="font-display mt-2 mb-8 text-3xl font-extrabold tracking-tight text-foreground">
              What they say
            </h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {branding.testimonials.map((t, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm italic text-muted-foreground">&ldquo;{t.text}&rdquo;</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">{t.author}</p>
                  {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {branding.faq && branding.faq.length > 0 && (
          <section className="py-14 bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 md:px-6">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
                FAQ
              </p>
              <h2 className="font-display mt-2 mb-8 text-3xl font-extrabold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {branding.faq.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-card p-5">
                    <p className="text-sm font-semibold text-foreground">{item.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-20 text-center" style={{ background: secondaryColor }}>
          <h2
            className="font-display text-4xl font-extrabold tracking-tight"
            style={{ color: onSecondary.fg }}
          >
            {branding.footer_cta_text ?? "Ready to level up?"}
          </h2>
          <a
            href="#offers"
            className="mt-6 inline-block rounded-xl px-8 py-4 text-base font-semibold transition hover:opacity-90"
            style={{ background: primaryColor, color: onPrimary.fg }}
          >
            {(branding.cta_text ?? "See programs")} →
          </a>
        </section>
      </main>
    </div>
  )
}

