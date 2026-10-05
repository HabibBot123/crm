import Link from "next/link"
import { brandOnSurface, formatAmountFromCents } from "@/lib/utils"
import { Check } from "lucide-react"

type PublicOrgOffer = {
  id: number
  title: string
  description: string | null
  price: number
  currency: string
  interval: "month" | "year" | null
  installment_count: number | null
  billing_type: "subscription" | "one_time" | "installment"
  key_features: string[] | null
}

const MOCK_ORG = {
  name: "Edge Performance",
  slug: "preview",
  branding: {
    logo_url: null as string | null,
    bio: "Personalized coaching programs to reach your full potential — science-backed methods, real results.",
    primary_color: "#e07b39",
  },
}

const MOCK_OFFERS: PublicOrgOffer[] = [
  {
    id: 1,
    title: "Technical Assessment",
    description:
      "A complete analysis session to identify your strengths and areas for improvement.",
    price: 14900,
    currency: "eur",
    interval: null,
    installment_count: null,
    billing_type: "one_time",
    key_features: [
      "60-min video analysis",
      "Detailed PDF report",
      "Personalised action plan",
    ],
  },
  {
    id: 2,
    title: "Intensive Coaching",
    description:
      "Full monthly coaching with weekly sessions and access to all content libraries.",
    price: 24900,
    currency: "eur",
    interval: "month",
    installment_count: null,
    billing_type: "subscription",
    key_features: [
      "4 live sessions / month",
      "Access to video programs",
      "Private group chat",
      "Monthly written review",
    ],
  },
  {
    id: 3,
    title: "3-Month Block",
    description:
      "A structured 12-week block for a lasting transformation in your performance.",
    price: 69900,
    currency: "eur",
    interval: null,
    installment_count: 3,
    billing_type: "installment",
    key_features: [
      "12 weeks of coaching",
      "Progress checkpoints",
      "Full content access",
    ],
  },
]

function billingLine(offer: PublicOrgOffer) {
  if (offer.billing_type === "subscription") {
    return offer.interval === "year" ? "Annual" : "Monthly"
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${offer.installment_count}× installments`
  }
  return "One-time"
}

export default function OrgPreviewPage() {
  const { name, branding } = MOCK_ORG
  const primaryColor = branding.primary_color
  const onPrimary = brandOnSurface(primaryColor)
  const initials = name
    .split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("")
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg px-4 py-10 md:py-14">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview — mock store page
        </p>

        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-lg font-bold">
            <span style={{ color: primaryColor }}>{initials}</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {name}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {branding.bio}
          </p>
        </header>

        <section id="offers" className="space-y-3">
          {MOCK_OFFERS.map((offer) => (
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
                  {offer.key_features.slice(0, 4).map((feature) => (
                    <li
                      key={feature}
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
                <Link
                  href={`/org/preview/buy/${offer.id}`}
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                  style={{ background: primaryColor, color: onPrimary.fg }}
                >
                  Buy
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
