"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  User as UserIcon,
  Mail,
  Shield,
  KeyRound,
  LogOut,
  Building2,
  Check,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { SectionCard } from "@/components/dashboard/section-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { NavList } from "@/components/dashboard/nav-list"
import type { NavListItem } from "@/components/dashboard/nav-list"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Section = "profile" | "security" | "organizations"

const nav: NavListItem<Section>[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "organizations", label: "Organizations", icon: Building2 },
]

function formatProvider(provider: string): string {
  const map: Record<string, string> = {
    email: "Email",
    google: "Google",
    github: "GitHub",
    apple: "Apple",
  }
  return map[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

export default function AccountPage() {
  const router = useRouter()
  const { user, supabase, signOut } = useAuth()
  const { organizations, currentOrganization, setCurrentOrganizationId } =
    useCurrentOrganization()
  const [section, setSection] = useState<Section>("profile")
  const [sendingReset, setSendingReset] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() ?? null
  const email = user?.email ?? null
  const primaryProvider =
    user?.app_metadata?.provider ?? user?.identities?.[0]?.provider ?? "email"
  const providers: string[] =
    (user?.app_metadata?.providers as string[] | undefined)?.filter(Boolean) ??
    (primaryProvider ? [primaryProvider] : [])
  const isEmailProvider = providers.includes("email")

  async function handleSendPasswordReset() {
    if (!email) return
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset-password`,
    })
    setSendingReset(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Check your email for the password reset link")
  }

  async function handleSignOut() {
    await signOut()
    router.push("/")
  }

  function handleSwitchOrg(orgId: number) {
    setCurrentOrganizationId(orgId)
    router.push("/dashboard")
  }

  if (!user) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-muted-foreground">Loading account…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Account" subtitle="Your profile and sign-in details" />

      <div className="flex gap-8">
        <NavList
          items={nav}
          value={section}
          onChange={setSection}
          footer={
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          }
        />

        {/* Right content */}
        <div className="min-w-0 flex-1 max-w-lg">
          {section === "profile" && (
            <SectionCard title="Profile" subtitle="Information associated with your account">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <p className="text-sm text-foreground">{fullName || "—"}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Email</span>
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {email || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Signed in with</span>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {providers.length > 0
                      ? providers.map((p) => formatProvider(p)).join(", ")
                      : formatProvider(primaryProvider)}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}

          {section === "security" && (
            <SectionCard
              title="Password"
              subtitle={
                isEmailProvider
                  ? "Change your password via a secure link sent to your email"
                  : `You sign in with ${providers.map((p) => formatProvider(p)).join(" and ") || formatProvider(primaryProvider)}. Password is managed by your provider.`
              }
            >
              {isEmailProvider && (
                <Button
                  variant="secondary"
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                >
                  {sendingReset ? "Sending…" : "Send password reset email"}
                </Button>
              )}
            </SectionCard>
          )}

          {section === "organizations" && (
            <SectionCard
              title="Organizations"
              subtitle="Switch between your organizations"
              action={
                <Button size="sm" variant="outline" asChild>
                  <Link href="/create-organization">
                    <Plus className="h-3.5 w-3.5" />
                    New organization
                  </Link>
                </Button>
              }
            >
              {organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No organizations found.</p>
              ) : (
                <ul className="space-y-1">
                  {organizations.map((org) => {
                    const isCurrent = org.id === currentOrganization?.id
                    const role = org.member_role
                      ? org.member_role.charAt(0).toUpperCase() + org.member_role.slice(1)
                      : "Member"
                    return (
                      <li
                        key={org.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                          isCurrent ? "bg-primary/5" : "hover:bg-accent"
                        )}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {org.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{role}</p>
                        </div>
                        {isCurrent ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                            <Check className="h-3.5 w-3.5" />
                            Current
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchOrg(org.id)}
                          >
                            Switch
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
