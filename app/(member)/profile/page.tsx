"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import { displayNameFromUser } from "@/lib/user-display"
import { useMyProfile } from "@/hooks/use-profile"
import { AccountProfileCard } from "@/components/profile/account-profile-card"
import { SecuritySection } from "@/components/profile/security-section"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { fetchCoachedEnrollments, fetchCoachedInvoices } from "@/lib/services/coached"

type Section = "profile" | "security" | "billing"

const nav: NavListItem<Section>[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "billing", label: "Billing", icon: CreditCard },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase() || "EUR",
  }).format(cents / 100)
}

export default function CoachedProfilePage() {
  const { user, isLoading: authLoading, signOut, supabase } = useAuth()
  const profileQuery = useMyProfile()
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["coached-enrollments", user?.id, user?.email],
    queryFn: () => {
      if (!user?.id || !user?.email) throw new Error("Not authenticated")
      return fetchCoachedEnrollments(supabase, user.id, user.email)
    },
    enabled: !!user?.id && !!user?.email,
  })
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["coached-invoices", user?.id],
    queryFn: () => fetchCoachedInvoices(supabase),
    enabled: !!user,
  })

  const [section, setSection] = useState<Section>("profile")
  const [portalLoadingOrgId, setPortalLoadingOrgId] = useState<number | null>(
    null
  )

  const displayName =
    profileQuery.data?.full_name?.trim() ||
    displayNameFromUser(user) ||
    user?.email?.split("@")[0] ||
    ""
  const email = user?.email ?? ""
  const avatarUrl = profileQuery.data?.avatar_url ?? null
  const memberSince = user?.created_at ? formatDate(user.created_at) : null

  async function handleOpenPortal(organizationId: number) {
    setPortalLoadingOrgId(organizationId)
    try {
      const res = await fetch("/api/stripe-connect/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to open billing portal"
        throw new Error(message)
      }
      if (
        data &&
        typeof data === "object" &&
        "url" in data &&
        typeof data.url === "string"
      ) {
        window.location.href = data.url
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open billing portal"
      toast.error(message)
    } finally {
      setPortalLoadingOrgId(null)
    }
  }

  if (authLoading || !user) {
    return <LoadingRows count={4} />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Account"
        subtitle="Your profile and sign-in details"
      />

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <NavList items={nav} value={section} onChange={setSection} />

        <div className="min-w-0 flex-1 space-y-4">
          {section === "profile" ? (
            <>
              <AccountProfileCard
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                memberSince={memberSince}
              />
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => {
                    window.location.href = "/login"
                  })
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </>
          ) : null}

          {section === "security" ? (
            <SecuritySection email={email || null} />
          ) : null}

          {section === "billing" ? (
            <>
              <SectionCard
                title="Enrollments"
                noPadding={enrollments.length > 0 && !enrollmentsLoading}
              >
                {enrollmentsLoading ? (
                  <LoadingRows count={3} />
                ) : enrollments.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No enrollments yet"
                    description="Purchase an offer from a coach to see them here."
                  />
                ) : (
                  <ul>
                    {enrollments.map((en) => (
                      <li
                        key={en.id}
                        className="flex flex-col gap-2 px-6 py-3 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {en.offer_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {en.organization_name} · {formatDate(en.started_at)}
                          </p>
                          <div className="mt-1">
                            <StatusBadge
                              status={en.status}
                              className="text-[10px] font-normal"
                            />
                          </div>
                        </div>
                        {en.stripe_customer_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() =>
                              void handleOpenPortal(en.organization_id)
                            }
                            disabled={portalLoadingOrgId !== null}
                          >
                            {portalLoadingOrgId === en.organization_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                            Manage billing
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Invoices"
                noPadding={invoices.length > 0 && !invoicesLoading}
              >
                {invoicesLoading ? (
                  <LoadingRows count={3} />
                ) : invoices.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No invoices yet"
                    description="Invoices appear here after you complete a purchase."
                  />
                ) : (
                  <ul>
                    {invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-col gap-2 px-6 py-3 hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {inv.offer_title ?? inv.organization_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {inv.offer_title != null &&
                            inv.organization_name !== "—"
                              ? `${inv.organization_name} · `
                              : ""}
                            {inv.stripe_created_at
                              ? formatDate(inv.stripe_created_at)
                              : formatDate(inv.created_at)}{" "}
                            · {formatAmount(inv.amount_cents, inv.currency)}
                          </p>
                        </div>
                        {inv.invoice_pdf_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            asChild
                          >
                            <a
                              href={inv.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            PDF pending
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
