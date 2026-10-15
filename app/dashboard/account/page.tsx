"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  User as UserIcon,
  KeyRound,
  LogOut,
  Building2,
  Check,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useMyProfile } from "@/hooks/use-profile"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { AccountProfileCard } from "@/components/profile/account-profile-card"
import { SecuritySection } from "@/components/profile/security-section"
import { SectionCard } from "@/components/dashboard/section-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { NavList } from "@/components/dashboard/nav-list"
import type { NavListItem } from "@/components/dashboard/nav-list"
import { cn } from "@/lib/utils"
import { teamMemberRoleLabel } from "@/lib/permissions/roles"
import { displayNameFromUser } from "@/lib/user-display"

type Section = "profile" | "security" | "organizations"

const nav: NavListItem<Section>[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "organizations", label: "Organizations", icon: Building2 },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function AccountPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const profileQuery = useMyProfile()
  const { organizations, currentOrganization, setCurrentOrganizationId } =
    useCurrentOrganization()
  const [section, setSection] = useState<Section>("profile")

  const fullName =
    profileQuery.data?.full_name?.trim() ||
    displayNameFromUser(user) ||
    user?.email?.split("@")[0] ||
    ""
  const email = user?.email ?? null
  const avatarUrl = profileQuery.data?.avatar_url ?? null
  const memberSince = user?.created_at ? formatDate(user.created_at) : null

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

      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <NavList items={nav} value={section} onChange={setSection} />

        <div className="min-w-0 flex-1 space-y-4">
          {section === "profile" ? (
            <>
              <AccountProfileCard
                displayName={fullName}
                email={email}
                avatarUrl={avatarUrl}
                memberSince={memberSince}
              />
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </>
          ) : null}

          {section === "security" ? (
            <SecuritySection email={email} />
          ) : null}

          {section === "organizations" ? (
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
                <p className="text-sm text-muted-foreground">
                  No organizations found.
                </p>
              ) : (
                <ul className="space-y-1">
                  {organizations.map((org) => {
                    const isCurrent = org.id === currentOrganization?.id
                    const role = teamMemberRoleLabel(org.member_role)
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
          ) : null}
        </div>
      </div>
    </div>
  )
}
