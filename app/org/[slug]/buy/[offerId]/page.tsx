"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock, ArrowLeft, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePublicOfferWithOrg } from "@/hooks/use-public-organization"
import { formatAmountFromCents } from "@/lib/utils"

type PageProps = {
  params: Promise<{ slug: string; offerId: string }>
}

function productIcon(type: string) {
  if (type === "course") return "📖"
  if (type === "coaching") return "🎯"
  return "🧩"
}

export default function BuyOfferPage({ params }: PageProps) {
  const { slug, offerId } = use(params)
  const searchParams = useSearchParams()
  const variantId = searchParams.get("variantId")

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)

  const { data, isLoading: dataLoading, error } = usePublicOfferWithOrg(
    slug,
    offerId,
    variantId
  )

  const dataError =
    !slug || !offerId
      ? "Use the link shared by your coach to access this page."
      : error
        ? "Unable to load offer. Please try again."
        : data === null
          ? "Offer not found."
          : null

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/stripe-connect/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: Number(offerId),
          paymentLinkId: variantId ? Number(variantId) : null,
          email,
          fullName,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to create checkout:", data)
        alert(data.error ?? "Unable to start checkout. Please try again.")
        setLoading(false)
        return
      }

      const { url } = (await res.json()) as { url: string }
      if (url) {
        window.location.href = url
      } else {
        setLoading(false)
        alert("Unable to start checkout. Please try again.")
      }
    } catch (err) {
      console.error(err)
      alert("Unexpected error. Please try again.")
      setLoading(false)
    }
  }

  const primaryColor = data?.organization.branding?.primary_color ?? "#e07b39"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 md:max-w-5xl">
          <Link
            href={`/org/${slug}`}
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

      <main className="mx-auto max-w-5xl px-4 py-10">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading offer…</p>
          </div>
        ) : dataError ? (
          <div className="rounded-2xl border border-border bg-card/60 p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">{dataError}</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-foreground">
                  Confirm your email
                </h1>
                <p className="text-sm text-muted-foreground">
                  Use the email you want linked to your coaching space. If you&apos;ve
                  already purchased from this coach, use the same email to keep all your
                  accesses in one place.
                </p>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wide">
                      Full name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    {loading ? "Redirecting to Stripe…" : "Continue to Stripe checkout"}
                  </Button>

                  <p className="text-[11px] text-muted-foreground">
                    After payment, you&apos;ll be redirected to create or access your
                    coaching account. Payments are processed securely by Stripe on behalf
                    of your coach.
                  </p>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Review your offer before paying
                  </h2>
                </div>
              </div>

              <div className="rounded-xl bg-background/60 space-y-4">
                <h3 className="text-base font-semibold text-foreground">
                  {data.offer.title}
                </h3>
                {data.offer.variant?.label && (
                  <p className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    Special offer · {data.offer.variant.label}
                  </p>
                )}

                <p className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Offer summary
                </p>

                {data.offer.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {data.offer.description}
                  </p>
                )}

                {data.offer.key_features && data.offer.key_features.length > 0 && (
                  <div className="space-y-2">
                    <p
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: primaryColor }}
                    >
                      Key highlights
                    </p>
                    <ul className="space-y-1">
                      {data.offer.key_features.map((f, i) => (
                        <li
                          key={`${f}-${i}`}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="mt-0.5 h-4 w-4" style={{ color: primaryColor }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.offer.products && data.offer.products.length > 0 && (
                  <div className="space-y-2">
                    <p
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: primaryColor }}
                    >
                      Products included
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.offer.products.map((p) => (
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
                )}

                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {data.offer.billing_type === "subscription" &&
                    (data.offer.interval === "month"
                      ? "Subscription — monthly"
                      : data.offer.interval === "year"
                        ? "Subscription — yearly"
                        : "Subscription")}
                  {data.offer.billing_type === "one_time" &&
                    (data.offer.installment_count != null && data.offer.installment_count > 1
                      ? "Installment plan"
                      : "One-time payment")}
                  {data.offer.billing_type === "installment" && "Installment plan"}
                </p>

                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-2xl font-semibold text-foreground">
                    {formatAmountFromCents(data.offer.price, data.offer.currency) ?? "—"}
                  </p>
                  {data.offer.billing_type === "subscription" && data.offer.interval === "month" && (
                    <span className="text-sm text-muted-foreground">/ month</span>
                  )}
                  {data.offer.billing_type === "subscription" && data.offer.interval === "year" && (
                    <span className="text-sm text-muted-foreground">/ year</span>
                  )}
                </div>

                {((data.offer.billing_type === "installment" ||
                  (data.offer.billing_type === "one_time" &&
                    data.offer.installment_count != null &&
                    data.offer.installment_count > 1)) &&
                  data.offer.installment_count != null &&
                  data.offer.installment_count > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {data.offer.installment_count} payment
                      {data.offer.installment_count > 1 ? "s" : ""} over{" "}
                      {data.offer.installment_count} month
                      {data.offer.installment_count > 1 ? "s" : ""} —{" "}
                      {formatAmountFromCents(
                        Math.round(data.offer.price / data.offer.installment_count),
                        data.offer.currency
                      )}{" "}
                      per payment
                    </p>
                  ))}

                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Coach
                  </p>
                  <div className="flex items-center gap-3">
                    {data.organization.branding?.logo_url ? (
                      <img
                        src={data.organization.branding.logo_url}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold text-muted-foreground"
                        style={{
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor,
                        }}
                      >
                        {data.organization.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground">
                      {data.organization.name}
                    </p>
                  </div>

                  {data.organization.branding?.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {data.organization.branding.description}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
