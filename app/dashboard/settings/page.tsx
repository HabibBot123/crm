"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ExternalLink,
  CreditCard,
  Globe,
  Shield,
  KeyRound,
  Wallet,
  Building2,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { NavList } from "@/components/dashboard/nav-list"
import type { NavListItem } from "@/components/dashboard/nav-list"
import { OrgPermissionsMatrix } from "@/components/dashboard/settings/org-permissions-matrix"
import { OrgCommissionPlanSettings } from "@/components/dashboard/settings/org-commission-plan"
import { BusinessUnitsPanel } from "@/components/dashboard/settings/business-units-panel"
import { SendingDomainPanel } from "@/components/dashboard/settings/sending-domain-panel"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import { TeamPlanGate } from "@/components/dashboard/team-plan-gate"

type Section =
  | "domain"
  | "email"
  | "payments"
  | "permissions"
  | "commissions"
  | "business-units"

const baseNav: NavListItem<Section>[] = [
  { id: "domain", label: "Domain", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
  { id: "payments", label: "Payments", icon: CreditCard },
]

function isSettingsSection(value: string | null): value is Section {
  return (
    value === "domain" ||
    value === "email" ||
    value === "payments" ||
    value === "permissions" ||
    value === "commissions" ||
    value === "business-units"
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrganization } = useCurrentOrganization()
  const { can, mode: orgMode } = useOrgCapabilities()
  const [section, setSection] = useState<Section>("domain")

  const stripeConnected = Boolean(currentOrganization?.stripe_account_id)
  const stripeReady = Boolean(currentOrganization?.stripe_onboarding_completed)
  const isOwner = currentOrganization?.member_role === "owner"
  const organizationId = currentOrganization?.id ?? null
  const canEditCommissionPlan = can("org.settings")

  useEffect(() => {
    const fromQuery = searchParams.get("section")
    if (isSettingsSection(fromQuery)) {
      if (fromQuery === "permissions" && !isOwner) return
      setSection(fromQuery)
    }
  }, [searchParams, isOwner])

  const nav: NavListItem<Section>[] = [
    ...baseNav,
    { id: "business-units", label: "Business units", icon: Building2 },
    { id: "commissions", label: "Commissions", icon: Wallet },
    ...(isOwner ? [{ id: "permissions" as const, label: "Permissions", icon: KeyRound }] : []),
  ]

  function onSectionChange(next: Section) {
    setSection(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set("section", next)
    router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <NavList
          items={nav}
          value={section === "permissions" && !isOwner ? "domain" : section}
          onChange={onSectionChange}
        />

        <div
          className={
            section === "permissions" ||
            section === "commissions" ||
            section === "business-units" ||
            section === "email"
              ? "min-w-0 flex-1"
              : "min-w-0 flex-1 max-w-lg"
          }
        >
          {section === "domain" && (
            <SectionCard
              title="Current domain"
              subtitle="Where clients buy your offers."
              action={<Badge variant="secondary" className="text-xs">Default</Badge>}
            >
              <p className="text-sm text-primary">
                {currentOrganization?.slug
                  ? `${currentOrganization.slug}.${process.env.NEXT_PUBLIC_APP_URL}`
                  : process.env.NEXT_PUBLIC_APP_URL}
              </p>
            </SectionCard>
          )}

          {section === "email" && (
            !organizationId ? (
              <EmptyState title="No organization" description="Select an organization first." />
            ) : (
              <SendingDomainPanel
                organizationId={organizationId}
                canEdit={can("org.settings")}
              />
            )
          )}

          {section === "payments" && (
            <SectionCard title="Stripe Connect" subtitle="Accept payments.">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {stripeConnected
                      ? "Stripe is connected."
                      : "Stripe is not connected yet."}
                  </p>
                  {stripeConnected && (
                    <p className={stripeReady ? "text-xs text-success" : "text-xs text-warning-foreground"}>
                      {stripeReady ? "Ready to accept payments." : "Finish setup on Stripe."}
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

          {section === "business-units" && (
            !organizationId ? (
              <EmptyState title="No organization" description="Select an organization first." />
            ) : orgMode.requiresTeamPlan ? (
              <TeamPlanGate
                title="Business units are a Team feature"
                description="Upgrade to Team to split reporting and commissions by unit."
              />
            ) : (
              <BusinessUnitsPanel organizationId={organizationId} />
            )
          )}

          {section === "commissions" && (
            !organizationId ? (
              <EmptyState title="No organization" description="Select an organization first." />
            ) : orgMode.requiresTeamPlan ? (
              <TeamPlanGate
                title="Commission plan is a Team feature"
                description="Upgrade to Team to configure payout schedules."
              />
            ) : (
              <OrgCommissionPlanSettings
                organizationId={organizationId}
                canEdit={canEditCommissionPlan}
              />
            )
          )}

          {section === "permissions" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Role permissions</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  What each role can do.
                </p>
              </div>
              {!organizationId ? (
                <EmptyState title="No organization" description="Select an organization first." />
              ) : !isOwner ? (
                <EmptyState
                  title="Owner only"
                  description="Only the organization owner can edit permissions."
                />
              ) : (
                <SectionCard noPadding>
                  <OrgPermissionsMatrix organizationId={organizationId} canEdit={isOwner} />
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
