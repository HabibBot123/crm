"use client"
import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, ArrowLeft, Check, Loader2 } from "lucide-react"

import { formatAmountFromCents } from "@/lib/utils"

type BrandingStat = {
  value: string
  label: string
}

type BrandingCredential = {
  icon: string
  text: string
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
    "Personalized coaching programs to reach your full potential — whether in-person or remote.",
  cta_text: "See our programs",
  bio:
    "Former Ligue 1 player and UEFA Pro coach. My method blends physical preparation, technical analysis and mental coaching for lasting results.",
  credentials: [
    { icon: "🏅", text: "UEFA Pro Licence — obtained in 2012" },
    { icon: "🎓", text: "Master in Sports Science, Paris XII University" },
  ],
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
    key_features: ["60-min video analysis", "Detailed PDF report", "Personalised action plan"],
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
    key_features: ["4 live sessions / month", "Access to video programs", "Private group chat"],
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
    key_features: ["12-week S&C plan", "12 individual sessions", "Lifetime access to content"],
    products: [
      { id: 6, title: "S&C Program", type: "coaching", cover_image_url: null },
      { id: 7, title: "Nutrition Guide", type: "course", cover_image_url: null },
    ],
  },
]

function billingLine(offer: PublicOrgOffer): string {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Subscription — yearly" : "Subscription — monthly"
  }
  if (offer.billing_type === "installment") return "Installment plan"
  return offer.installment_count != null && offer.installment_count > 1
    ? "Installment plan"
    : "One-time payment"
}

function productIcon(type: string) {
  if (type === "course") return "📖"
  if (type === "coaching") return "🎯"
  return "🧩"
}

type PageProps = {
  params: Promise<{ offerId: string }>
}

export default function PreviewBuyOfferPage({ params }: PageProps) {
  const { offerId } = use(params)
  const router = useRouter()

  const offer = useMemo(() => {
    const numericId = Number(offerId)
    return MOCK_OFFERS.find((o) => o.id === numericId) ?? null
  }, [offerId])

  const primaryColor = MOCK_BRANDING.primary_color ?? "#e07b39"

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) return
    setLoading(true)
    // Preview only — don't call Stripe.
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    alert("Preview only: in the real flow this would redirect to Stripe checkout.")
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:max-w-5xl">
            <Link
              href="/org/preview"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Secure checkout via Stripe
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-border bg-card/60 p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Offer not found in preview.</p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40"
              onClick={() => router.push("/org/preview")}
            >
              Go to preview home
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:max-w-5xl">
          <Link
            href="/org/preview"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout via Stripe
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2">
        {/* Email / checkout form */}
        <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Confirm your email</h1>
            <p className="text-sm text-muted-foreground">
              Preview mode. In the real purchase flow you&apos;ll link your coaching space to your email after payment.
            </p>
          </div>

          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent/50"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing…
                  </span>
                ) : (
                  "Continue to Stripe checkout (preview)"
                )}
              </button>

              <p className="text-[11px] text-muted-foreground">
                The UI below shows what the customer gets for this offer: included products + key highlights.
              </p>
            </div>
          </form>
        </section>

        {/* Offer summary */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Review your offer before paying</h2>
            <p className="text-xs text-muted-foreground">What you get</p>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">{offer.title}</h3>
                <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Offer summary
                </div>
                <p className="text-xs text-muted-foreground">{billingLine(offer)}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground" style={{ color: primaryColor }}>
                  {formatAmountFromCents(offer.price, offer.currency) ?? "—"}
                </div>
                {offer.interval === "month" && <p className="text-xs text-muted-foreground">/ month</p>}
                {offer.interval === "year" && <p className="text-xs text-muted-foreground">/ year</p>}
              </div>
            </div>

            {offer.description && <p className="text-sm leading-relaxed text-muted-foreground">{offer.description}</p>}

            {offer.key_features && offer.key_features.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>
                  Key highlights
                </p>
                <ul className="space-y-1">
                  {offer.key_features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4" style={{ color: primaryColor }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>
                Products included
              </p>
              <div className="flex flex-wrap gap-2">
                {offer.products.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground"
                    style={{ color: primaryColor }}
                  >
                    <span aria-hidden>{productIcon(p.type)}</span>
                    {p.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Coach note</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{MOCK_BRANDING.bio}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

