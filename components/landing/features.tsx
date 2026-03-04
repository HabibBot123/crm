import { BookOpen, BarChart3, Users, Zap, Globe, Shield } from "lucide-react"

const features = [
  {
    icon: BookOpen,
    title: "Content Builder",
    description: "Create courses, ebooks, and coaching programs with a powerful drag-and-drop builder.",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    description: "Track sales, revenue, and conversion rates with beautiful real-time dashboards.",
  },
  {
    icon: Users,
    title: "Client Management",
    description: "CRM-style client management with tags, assignments, and pipeline tracking.",
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Collect payments via Stripe with automatic payouts and revenue splitting.",
  },
  {
    icon: Globe,
    title: "White-Label Ready",
    description: "Custom branding, domains, and fully branded experience for your audience.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant",
    description: "Each coach gets their own workspace with separate products, clients, and branding.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Features</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground font-display sm:text-4xl">
            Built for coaches who mean business
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground leading-relaxed">
            Everything you need to launch, sell, and scale your coaching business, all in one platform.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
