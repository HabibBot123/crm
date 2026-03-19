import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    price: "$0",
    interval: "forever",
    description: "Perfect for getting started and testing the waters.",
    features: [
      "1 published product",
      "Up to 50 clients",
      "Basic analytics",
      "Email support",
      "CoachStack branding",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$49",
    interval: "/month",
    description: "For growing coaches ready to scale their business.",
    features: [
      "Unlimited products",
      "Up to 1,000 clients",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Team members (up to 3)",
      "Custom domain",
    ],
    cta: "Start Pro trial",
    popular: true,
  },
  {
    name: "Business",
    price: "$149",
    interval: "/month",
    description: "For established coaching businesses and teams.",
    features: [
      "Everything in Pro",
      "Unlimited clients",
      "White-label experience",
      "Unlimited team members",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact sales",
    popular: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground font-display sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground leading-relaxed">
            Start for free, upgrade when you are ready. No hidden fees.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-card p-8",
                plan.popular
                  ? "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Most popular
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground font-display">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.interval}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block">
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
