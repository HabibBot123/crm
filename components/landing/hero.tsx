import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.08,transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              New
            </span>
            Built for modern coaches
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground font-display sm:text-5xl lg:text-6xl">
            Everything you need to grow your coaching business
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Sell courses, ebooks, and coaching programs. Manage clients, leads, and your team.
            All from one premium platform built for scale.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="gap-2 px-8 text-base">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
              <Play className="h-4 w-4" />
              Watch demo
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Free plan available.
          </p>
        </div>

        <div className="mx-auto mt-20 max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/40" />
              <div className="h-3 w-3 rounded-full bg-warning/40" />
              <div className="h-3 w-3 rounded-full bg-success/40" />
              <span className="ml-4 text-xs text-muted-foreground">app.coachpro.io/dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-4 p-6">
              {[
                { label: "Revenue", value: "$55.3K", change: "+18.2%" },
                { label: "Clients", value: "342", change: "+12.5%" },
                { label: "Sales", value: "198", change: "+24.1%" },
                { label: "Conversion", value: "3.2%", change: "+0.8%" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground font-display">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-success">{stat.change}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <div className="h-40 rounded-lg bg-muted/50 flex items-end px-4 pb-4 gap-3">
                {[40, 60, 55, 80, 70, 95, 85, 90, 75, 100, 88, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-primary/20" style={{ height: `${h}%` }}>
                    <div className="h-full w-full rounded-t-sm bg-primary" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
