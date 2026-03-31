"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, CreditCard, Globe, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { NavList } from "@/components/dashboard/nav-list"
import type { NavListItem } from "@/components/dashboard/nav-list"

type Section = "domain" | "payments"

const nav: NavListItem<Section>[] = [
  { id: "domain", label: "Domain", icon: Globe },
  { id: "payments", label: "Payments", icon: CreditCard },
]

export default function SettingsPage() {
  const router = useRouter()
  const { currentOrganization } = useCurrentOrganization()
  const [section, setSection] = useState<Section>("domain")

  const stripeConnected = Boolean(currentOrganization?.stripe_account_id)
  const stripeReady = Boolean(currentOrganization?.stripe_onboarding_completed)

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Settings" subtitle="Manage your organization settings" />

      <div className="flex gap-8">
        <NavList items={nav} value={section} onChange={setSection} />

        {/* Right content */}
        <div className="min-w-0 flex-1 max-w-lg">
          {section === "domain" && (
            <SectionCard
              title="Current domain"
              subtitle="This is were your leads can buy your products"
              action={<Badge variant="secondary" className="text-xs">Default</Badge>}
            >
              <p className="text-sm text-primary">
                {currentOrganization?.slug
                  ? `${currentOrganization.slug}.${process.env.NEXT_PUBLIC_APP_URL}`
                  : process.env.NEXT_PUBLIC_APP_URL}
              </p>
            </SectionCard>
          )}

          {section === "payments" && (
            <SectionCard title="Stripe Connect" subtitle="Accept payments and manage subscriptions">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {stripeConnected
                      ? "Stripe is connected for this organization."
                      : "Stripe is not connected yet for this organization."}
                  </p>
                  {stripeConnected && (
                    <p className={stripeReady ? "text-xs text-success" : "text-xs text-warning-foreground"}>
                      {stripeReady ? "Ready to accept payments." : "Complete setup on Stripe to accept payments."}
                    </p>
                  )}
                </div>
                <Button
                  className="mt-6 gap-2"
                  onClick={() => router.push("/dashboard/stripe-connect")}
                  disabled={!currentOrganization}
                >
                  <ExternalLink className="h-4 w-4" />
                  Manage Stripe connection
                </Button>
                <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure</span>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> PCI compliant</span>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Instant payouts</span>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
