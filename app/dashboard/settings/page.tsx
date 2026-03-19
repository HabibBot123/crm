"use client"

import { useRouter } from "next/navigation"
import { ExternalLink, CreditCard, Globe, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useCurrentOrganization } from "@/components/providers/organization-provider"

export default function SettingsPage() {
  const router = useRouter()
  const { currentOrganization } = useCurrentOrganization()

  const stripeConnected = Boolean(currentOrganization?.stripe_account_id)
  const stripeReady = Boolean(currentOrganization?.stripe_onboarding_completed)

  const handleConfigureStripe = () => {
    router.push("/dashboard/stripe-connect")
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-bold text-foreground font-display">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your workspace settings</p>

      <Tabs defaultValue="domain" className="mt-8">
        <TabsList>
          <TabsTrigger value="domain" className="gap-2"><Globe className="h-4 w-4" /> Domain</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

        {/* Domain */}
        <TabsContent value="domain" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Current domain</h3>
                  <p className="mt-1 text-sm text-primary">
                    {currentOrganization?.slug
                      ? `${currentOrganization.slug}.${process.env.NEXT_PUBLIC_APP_URL}`
                      : process.env.NEXT_PUBLIC_APP_URL}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">Default</Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Connect Stripe</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Connect your Stripe account to start accepting payments and managing subscriptions.
              </p>
              <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">
                  {stripeConnected
                    ? "Stripe is connected for this organization."
                    : "Stripe is not connected yet for this organization."}
                </span>
                {stripeConnected && (
                  <span
                    className={
                      stripeReady
                        ? "text-xs text-emerald-600"
                        : "text-xs text-amber-600"
                    }
                  >
                    {stripeReady
                      ? "Ready to accept payments."
                      : "Complete setup on Stripe to accept payments."}
                  </span>
                )}
              </div>
              <Button className="mt-6 gap-2" onClick={handleConfigureStripe} disabled={!currentOrganization}>
                <ExternalLink className="h-4 w-4" />
                Manage Stripe connection
              </Button>
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> PCI compliant</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Instant payouts</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
