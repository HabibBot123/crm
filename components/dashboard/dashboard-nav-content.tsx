"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { getInitials } from "@/components/dashboard/user-avatar"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  DASHBOARD_NAV_GROUPS,
  filterDashboardNavGroups,
  isDashboardNavActive,
} from "@/lib/permissions/dashboard-nav"
import { teamMemberRoleLabel } from "@/lib/permissions/roles"

type DashboardNavContentProps = {
  collapsed?: boolean
  onNavigate?: () => void
  showThemeToggle?: boolean
}

export function DashboardNavContent({
  collapsed = false,
  onNavigate,
  showThemeToggle = true,
}: DashboardNavContentProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { currentOrganization } = useCurrentOrganization()
  const { can, isLoading: capabilitiesLoading, mode } = useOrgCapabilities()

  const navGroups = filterDashboardNavGroups(DASHBOARD_NAV_GROUPS, {
    can,
    requiresTeamPlan: mode.requiresTeamPlan,
    capabilitiesLoading,
  })

  const fullName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || null
  const email = user?.email ?? null
  const userInitial = getInitials(fullName, email)

  const roleLine = currentOrganization
    ? `${teamMemberRoleLabel(currentOrganization.member_role)} of ${currentOrganization.name}`
    : null

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isDashboardNavActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? <span>{item.label}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <div className="flex items-center gap-1">
          {user ? (
            <Link
              href="/dashboard/account"
              title={[fullName, email].filter(Boolean).join(" · ") || "Account"}
              onClick={onNavigate}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent",
                pathname === "/dashboard/account" && "bg-sidebar-accent",
                collapsed && "justify-center"
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {userInitial}
              </span>
              {!collapsed && (fullName || email) ? (
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">
                    {fullName || email}
                  </p>
                  {roleLine ? (
                    <p className="truncate text-[10px] text-sidebar-foreground/50">
                      {roleLine}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Link>
          ) : null}
          {showThemeToggle ? (
            <span className="shrink-0">
              <ThemeToggle />
            </span>
          ) : null}
        </div>
      </div>
    </>
  )
}
