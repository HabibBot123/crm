import { formatAmountFromCents } from "@/lib/utils"
import { Check } from "lucide-react"

// Local mock types.
// Your real types live in `lib/services/organizations.ts`, but for preview we only
// need to ensure the mock data compiles even if the branding schema evolves.
type BrandingStat = {
  value: string
  label: string
}

type BrandingTestimonial = {
  author: string
  role?: string | null
  text: string
  rating?: number | null
}

type BrandingFaqItem = {
  question: string
  answer: string
}

type BrandingCredential = {
  icon: string
  text: string
}

type OrganizationBranding = {
  logo_url?: string | null
  description?: string | null
  primary_color?: string | null
  secondary_color?: string | null

  tagline?: string | null
  hero_image_url?: string | null
  cta_text?: string | null

  bio?: string | null
  credentials?: BrandingCredential[] | null

  stats?: BrandingStat[] | null
  testimonials?: BrandingTestimonial[] | null
  faq?: BrandingFaqItem[] | null

  offers_section_title?: string | null
  footer_cta_text?: string | null

  // Preview-only: how to display offers on the public purchase page.
  offers_display?: {
    visible_offer_ids: number[]
    featured_offer_id: number | null
  } | null
}

type PublicOrgProduct = {
  id: number
  title: string
  type: string
  cover_image_url: string | null
}

type PublicOrgOffer = {
  id: number
  title: string
  description: string | null
  price: number
  currency: string
  interval: "month" | "year" | null
  installment_count: number | null
  stripe_payment_link: string | null
  billing_type: "subscription" | "one_time" | "installment"

  // mock customizations
  key_features: string[] | null
  products: PublicOrgProduct[]
}

// ─── mock data ───────────────────────────────────────────────────────────────

const MOCK_BRANDING: OrganizationBranding = {
  primary_color: "#e07b39",
  secondary_color: "#111827",
  logo_url: null,
  tagline: "🏆 UEFA Pro Certified Coach",
  description:
    "Personalized coaching programs to reach your full potential — whether in-person or remote. Science-backed methods, real results.",
  hero_image_url: null,
  cta_text: "See our programs",
  bio: "Former Ligue 1 player and UEFA Pro coach, I've been working with amateur and semi-pro athletes for 18 years. My method combines physical preparation, technical analysis and mental coaching for lasting results.\n\nI've guided 300+ athletes in their progression, from grassroots clubs to professional teams.",
  credentials: [
    { icon: "🏅", text: "UEFA Pro Licence — obtained in 2012" },
    { icon: "🎓", text: "Master in Sports Science, Paris XII University" },
    { icon: "⚽", text: "Former professional player (2001–2008)" },
  ],
  stats: [
    { value: "312+", label: "Athletes trained" },
    { value: "4.9/5", label: "Average rating" },
    { value: "18 yrs", label: "Experience" },
    { value: "98%", label: "Satisfaction rate" },
  ],
  testimonials: [
    {
      author: "Antoine L.",
      role: "Amateur footballer, U18",
      text: "In 3 months of intensive coaching I progressed more than in the previous 2 years combined. Marc has an incredible ability to pinpoint exactly where you need to work.",
      rating: 5,
    },
    {
      author: "Sofia C.",
      role: "D2F player",
      text: "The technical assessment opened my eyes to postural flaws I never noticed. The PDF report is incredibly detailed — I still refer back to it months later.",
      rating: 5,
    },
    {
      author: "Raphaël M.",
      role: "Goalkeeper, National 3",
      text: "Live sessions are intense and very well prepared. Marc adapts every session to my level. Access to videos between sessions is a real bonus.",
      rating: 4,
    },
  ],
  faq: [
    {
      question: "Are sessions in-person or online?",
      answer:
        "Both! You can choose when booking. I travel within 30 km of Paris, and online sessions take place over Zoom.",
    },
    {
      question: "Can I switch plans mid-way?",
      answer:
        "Yes, you can upgrade or downgrade your subscription at any time. Changes take effect at the next billing cycle.",
    },
    {
      question: "How does the first contact work?",
      answer:
        "After signing up, I'll reach out within 24h for a free 20-min discovery call to understand your specific goals.",
    },
    {
      question: "Are payments secure?",
      answer:
        "Absolutely. All payments go through Stripe, the world reference for secure online payments.",
    },
  ],
  offers_section_title: "Choose your program",
  footer_cta_text: "Ready to level up?",
  offers_display: {
    visible_offer_ids: [1, 2, 3],
    featured_offer_id: 2,
  },
}

const MOCK_OFFERS: PublicOrgOffer[] = [
  {
    id: 1,
    title: "Technical Assessment",
    description: "A complete analysis session to identify your strengths and areas for improvement.",
    price: 14900,
    currency: "eur",
    interval: null,
    installment_count: null,
    stripe_payment_link: null,
    billing_type: "one_time",
    key_features: [
      "60-min video analysis",
      "Detailed PDF report",
      "Personalised action plan",
    ],
    products: [
      { id: 1, title: "Biomechanics Course", type: "course", cover_image_url: null },
      { id: 2, title: "PDF Report", type: "course", cover_image_url: null },
    ],
  },
  {
    id: 2,
    title: "Intensive Coaching",
    description: "Full monthly coaching with weekly sessions and access to all content libraries.",
    price: 24900,
    currency: "eur",
    interval: "month",
    installment_count: null,
    stripe_payment_link: null,
    billing_type: "subscription",
    key_features: [
      "4 live sessions / month",
      "Access to video programs",
      "Private group chat",
      "Monthly written review",
    ],
    products: [
      { id: 3, title: "Video Program", type: "course", cover_image_url: null },
      { id: 4, title: "Resources Library", type: "course", cover_image_url: null },
      { id: 5, title: "S&C Plan", type: "coaching", cover_image_url: null },
    ],
  },
  {
    id: 3,
    title: "3-Month Block",
    description: "A structured 12-week block for a lasting transformation in your performance.",
    price: 29900,
    currency: "eur",
    interval: null,
    installment_count: 3,
    stripe_payment_link: null,
    billing_type: "installment",
    key_features: [
      "12-week S&C plan",
      "12 individual sessions",
      "Basic nutrition included",
      "Lifetime access to content",
    ],
    products: [
      { id: 6, title: "S&C Program", type: "coaching", cover_image_url: null },
      { id: 7, title: "Nutrition Guide", type: "course", cover_image_url: null },
    ],
  },
]

const MOCK_ORG_NAME = "Marc Coaching"
const MOCK_ENROLLMENT_COUNT = 312

// ─── helpers ─────────────────────────────────────────────────────────────────

function billingLabel(
  type: PublicOrgOffer["billing_type"],
  interval: string | null,
  installments: number | null
) {
  if (type === "subscription")
    return interval === "year" ? "Annual subscription" : "Monthly subscription"
  if (type === "installment" && installments) return `${installments}× installments`
  return "One-time payment"
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </div>
  )
}

function orgInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2)
}

// ─── sub-components ──────────────────────────────────────────────────────────

function NavBar({
  orgName,
  logoUrl,
  primaryColor,
  ctaText,
}: {
  orgName: string
  logoUrl?: string | null
  primaryColor: string
  ctaText: string
}) {
  return (
    <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur-md md:px-12">
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[11px] font-bold text-white"
          style={{ background: primaryColor }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} className="h-full w-full object-cover" />
          ) : (
            orgInitials(orgName)
          )}
        </div>
        <span className="font-display text-sm font-semibold text-foreground">{orgName}</span>
      </div>
      <a
        href="#offers"
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: primaryColor }}
      >
        {ctaText}
      </a>
    </nav>
  )
}

function HeroSection({
  orgName,
  branding,
  primaryColor,
  enrollmentCount,
}: {
  orgName: string
  branding: OrganizationBranding
  primaryColor: string
  enrollmentCount: number
}) {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 md:grid-cols-2 md:items-center md:px-12 md:py-24">
      <div>
        {branding.tagline && (
          <span
            className="mb-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ background: `${primaryColor}18`, color: primaryColor }}
          >
            {branding.tagline}
          </span>
        )}
        <h1 className="font-display mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground md:text-5xl">
          {orgName}
        </h1>
        {branding.description && (
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
            {branding.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#offers"
            className="rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: primaryColor }}
          >
            {branding.cta_text ?? "See programs"}
          </a>
          {branding.bio && (
            <a
              href="#about"
              className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Learn more
            </a>
          )}
        </div>
      </div>

      <div className="relative">
        {branding.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.hero_image_url}
            alt={orgName}
            className="w-full rounded-2xl object-cover shadow-lg"
            style={{ aspectRatio: "4/5" }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-2xl text-8xl opacity-10"
            style={{ aspectRatio: "4/5", background: `${primaryColor}14` }}
          >
            🏃
          </div>
        )}
        {enrollmentCount > 0 && (
          <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-md">
            <span className="text-2xl">⚡</span>
            <div className="text-sm leading-tight">
              <strong className="block text-foreground">{enrollmentCount}+ athletes</strong>
              <span className="text-muted-foreground">already enrolled</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function StatsBar({
  stats,
  primaryColor,
  secondaryColor,
}: {
  stats: { value: string; label: string }[]
  primaryColor: string
  secondaryColor: string
}) {
  return (
    <div style={{ background: secondaryColor }} className="py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-around gap-6 px-6 md:px-12">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="font-display text-3xl font-extrabold"
              style={{ color: primaryColor }}
            >
              {s.value}
            </div>
            <div className="mt-1 text-xs text-white/60">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OfferCard({
  offer,
  primaryColor,
  featured,
}: {
  offer: PublicOrgOffer
  primaryColor: string
  featured: boolean
}) {
  return (
    <article
      className="relative flex flex-col rounded-2xl border bg-card p-7 transition hover:-translate-y-0.5 hover:shadow-lg"
      style={{ borderColor: featured ? primaryColor : undefined }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[11px] font-bold text-white"
          style={{ background: primaryColor }}
        >
          Featured
        </div>
      )}

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {billingLabel(offer.billing_type, offer.interval, offer.installment_count)}
      </p>
      <h3 className="font-display mb-2 text-xl font-bold text-foreground">{offer.title}</h3>
      {offer.description && (
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
      )}

      {offer.key_features && offer.key_features.length > 0 && (
        <ul className="mb-5 flex flex-col gap-2">
          {offer.key_features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primaryColor }} />
              {f}
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
          href={`/org/preview/buy/${offer.id}`}
          className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:opacity-90"
          style={
            featured
              ? { background: primaryColor, color: "#fff" }
              : { border: `1.5px solid ${primaryColor}`, color: primaryColor }
          }
        >
          {featured ? "Get started →" : "Learn more →"}
        </a>
      </div>
    </article>
  )
}

function OffersSection({
  offers,
  primaryColor,
  sectionTitle,
  featuredOfferId,
}: {
  offers: PublicOrgOffer[]
  primaryColor: string
  sectionTitle: string
  featuredOfferId: number | null
}) {
  return (
    <section id="offers" className="mx-auto max-w-6xl px-6 py-16 md:px-12">
      <p
        className="mb-2 text-xs font-bold uppercase tracking-widest"
        style={{ color: primaryColor }}
      >
        Programs
      </p>
      <h2 className="font-display mb-12 text-3xl font-extrabold tracking-tight text-foreground">
        {sectionTitle}
      </h2>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            primaryColor={primaryColor}
            featured={featuredOfferId != null && offer.id === featuredOfferId}
          />
        ))}
      </div>
    </section>
  )
}

function AboutSection({
  branding,
  orgName,
  logoUrl,
  primaryColor,
}: {
  branding: OrganizationBranding
  orgName: string
  logoUrl: string | null
  primaryColor: string
}) {
  return (
    <section id="about" className="bg-muted/40 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-[320px_1fr] md:items-center md:px-12">
        <div
          className="flex w-full items-center justify-center rounded-2xl text-8xl opacity-10"
          style={{ aspectRatio: "3/4", background: `${primaryColor}14` }}
        >
          👤
        </div>
        <div>
          <p
            className="mb-2 text-xs font-bold uppercase tracking-widest"
            style={{ color: primaryColor }}
          >
            About
          </p>
          <h2 className="font-display mb-4 text-3xl font-extrabold tracking-tight text-foreground">
            {orgName}
          </h2>
          <div className="mb-5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-xs font-bold">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={orgName} className="h-full w-full object-cover" />
              ) : (
                orgInitials(orgName)
              )}
            </div>
          </div>
          <p className="mb-8 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {branding.bio}
          </p>
          {branding.credentials && (
            <ul className="flex flex-col gap-3">
              {branding.credentials.map((c, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ background: `${primaryColor}14` }}
                  >
                    {c.icon}
                  </span>
                  <span className="text-foreground">{c.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({
  testimonials,
  primaryColor,
}: {
  testimonials: NonNullable<OrganizationBranding["testimonials"]>
  primaryColor: string
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-12">
      <p
        className="mb-2 text-xs font-bold uppercase tracking-widest"
        style={{ color: primaryColor }}
      >
        Testimonials
      </p>
      <h2 className="font-display mb-12 text-3xl font-extrabold tracking-tight text-foreground">
        What they say
      </h2>
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <div key={i} className="flex flex-col rounded-2xl border border-border bg-card p-6">
            {t.rating != null && <Stars rating={t.rating} />}
            <p className="my-4 flex-1 text-sm italic leading-relaxed text-muted-foreground">
              &ldquo;{t.text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: `${primaryColor}18`, color: primaryColor }}
              >
                {t.author
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.author}</p>
                {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FaqSection({
  faq,
  primaryColor,
}: {
  faq: NonNullable<OrganizationBranding["faq"]>
  primaryColor: string
}) {
  return (
    <section className="bg-muted/40 py-16">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <p
          className="mb-2 text-xs font-bold uppercase tracking-widest"
          style={{ color: primaryColor }}
        >
          FAQ
        </p>
        <h2 className="font-display mb-10 text-3xl font-extrabold tracking-tight text-foreground">
          Frequently asked questions
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {faq.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <p className="mb-2 text-sm font-semibold text-foreground">{item.question}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const primaryColor = MOCK_BRANDING.primary_color!
  const secondaryColor = MOCK_BRANDING.secondary_color ?? "#111827"

  const visibleOfferIds = MOCK_BRANDING.offers_display?.visible_offer_ids ?? []
  const featuredOfferIdRaw = MOCK_BRANDING.offers_display?.featured_offer_id ?? null

  const visibleOffers =
    visibleOfferIds.length > 0
      ? visibleOfferIds
          .map((id) => MOCK_OFFERS.find((o) => o.id === id) ?? null)
          .filter((o): o is PublicOrgOffer => o != null)
      : MOCK_OFFERS

  const featuredOfferId =
    featuredOfferIdRaw != null && visibleOffers.some((o) => o.id === featuredOfferIdRaw)
      ? featuredOfferIdRaw
      : null

  return (
    <div className="min-h-screen bg-background">
      {/* Preview banner */}
      <div className="flex items-center justify-center gap-2 bg-amber-400 py-2 text-xs font-semibold text-amber-900">
        <span>🔍 Preview mode — mock data</span>
        <span className="opacity-60">|</span>
        <span className="opacity-60">This page uses hardcoded sample data</span>
      </div>

      <NavBar
        orgName={MOCK_ORG_NAME}
        logoUrl={MOCK_BRANDING.logo_url}
        primaryColor={primaryColor}
        ctaText={MOCK_BRANDING.cta_text!}
      />

      <HeroSection
        orgName={MOCK_ORG_NAME}
        branding={MOCK_BRANDING}
        primaryColor={primaryColor}
        enrollmentCount={MOCK_ENROLLMENT_COUNT}
      />

      <StatsBar
        stats={MOCK_BRANDING.stats!}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />

      <OffersSection
        offers={visibleOffers}
        primaryColor={primaryColor}
        sectionTitle={MOCK_BRANDING.offers_section_title!}
        featuredOfferId={featuredOfferId}
      />

      <AboutSection
        branding={MOCK_BRANDING}
        orgName={MOCK_ORG_NAME}
        logoUrl={MOCK_BRANDING.logo_url ?? null}
        primaryColor={primaryColor}
      />

      <TestimonialsSection
        testimonials={MOCK_BRANDING.testimonials!}
        primaryColor={primaryColor}
      />

      <FaqSection faq={MOCK_BRANDING.faq!} primaryColor={primaryColor} />

      <section style={{ background: secondaryColor }} className="py-20 text-center">
        <h2 className="font-display mb-4 text-4xl font-extrabold tracking-tight text-white">
          {MOCK_BRANDING.footer_cta_text}
        </h2>
        <a
          href="#offers"
          className="inline-block rounded-xl px-8 py-4 text-base font-semibold text-white transition hover:opacity-90"
          style={{ background: primaryColor }}
        >
          {MOCK_BRANDING.cta_text} →
        </a>
      </section>
    </div>
  )
}
