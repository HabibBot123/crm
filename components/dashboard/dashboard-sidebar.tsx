"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  FileText,
  UserPlus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { getInitials } from "@/components/dashboard/user-avatar"

const navGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview",  href: "/dashboard",          icon: LayoutDashboard },
      { label: "Clients",   href: "/dashboard/clients",  icon: Users           },
      { label: "Coaching",  href: "/dashboard/coaching", icon: MessageCircle   },
    ],
  },
  {
    label: "Monetize",
    items: [
      { label: "Offers",    href: "/dashboard/offers",   icon: Tag             },
      { label: "Products",  href: "/dashboard/products", icon: Package         },
      { label: "Content",   href: "/dashboard/content",  icon: FileText        },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Branding",  href: "/dashboard/branding", icon: Palette         },
      { label: "Team",      href: "/dashboard/team",     icon: UserPlus        },
      { label: "Settings",  href: "/dashboard/settings", icon: Settings        },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { currentOrganization } = useCurrentOrganization()
  const [collapsed, setCollapsed] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() || null
  const email = user?.email ?? null
  const userInitial = getInitials(fullName, email)

  const roleLine = currentOrganization
    ? `${currentOrganization.member_role ? currentOrganization.member_role.charAt(0).toUpperCase() + currentOrganization.member_role.slice(1) : "Member"} of ${currentOrganization.name}`
    : null

  return (
    <>
      <div
        className={cn(
          "hidden flex-shrink-0 lg:block lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar lg:flex lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
      >
        {/* Logo + collapse */}
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                C
              </span>
              <span className="font-display text-sm font-semibold text-sidebar-foreground">
                CoachStack
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft className="h-3.5 w-3.5" />
            }
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href))

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom: user profile + theme toggle */}
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center gap-1">
            {user && (
              <Link
                href="/dashboard/account"
                title={[fullName, email].filter(Boolean).join(" · ") || "Account"}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent",
                  pathname === "/dashboard/account" && "bg-sidebar-accent",
                  collapsed && "justify-center"
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {userInitial}
                </span>
                {!collapsed && (fullName || email) && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-xs font-medium text-sidebar-foreground">
                      {fullName || email}
                    </p>
                    {roleLine && (
                      <p className="truncate text-[10px] text-sidebar-foreground/50">{roleLine}</p>
                    )}
                  </div>
                )}
              </Link>
            )}
            <span className="shrink-0">
              <ThemeToggle />
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
