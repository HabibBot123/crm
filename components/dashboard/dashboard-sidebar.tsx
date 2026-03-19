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
import { OrgSwitcher } from "@/components/org-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getInitials } from "@/components/dashboard/user-avatar"

const navItems = [
  { label: "Overview",  href: "/dashboard",          icon: LayoutDashboard },
  { label: "Products",  href: "/dashboard/products", icon: Package         },
  { label: "Offers",    href: "/dashboard/offers",   icon: Tag             },
  { label: "Clients",   href: "/dashboard/clients",  icon: Users           },
  { label: "Coaching",  href: "/dashboard/coaching", icon: MessageCircle   },
  { label: "Content",   href: "/dashboard/content",  icon: FileText        },
  { label: "Branding",  href: "/dashboard/branding", icon: Palette         },
  { label: "Team",      href: "/dashboard/team",     icon: UserPlus        },
  { label: "Settings",  href: "/dashboard/settings", icon: Settings        },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() || null
  const email = user?.email ?? null
  const userInitial = getInitials(fullName, email)

  return (
    <>
      {/* Spacer so main content doesn't slide under sidebar */}
      <div
        className={cn(
          "hidden flex-shrink-0 lg:block lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar lg:flex lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Top: OrgSwitcher + collapse toggle */}
        <div className="flex h-16 min-w-0 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <OrgSwitcher />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed
              ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />
            }
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))

              return (
                <li key={item.href} className="relative">
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-sidebar-primary" />
                  )}
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom: user profile + theme toggle */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-1">
            {user && (
              <Link
                href="/dashboard/account"
                title={[fullName, email].filter(Boolean).join(" · ") || "Account"}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60",
                  pathname === "/dashboard/account" && "bg-sidebar-accent",
                  collapsed && "justify-center"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {userInitial}
                </span>
                {!collapsed && (fullName || email) && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-xs font-medium text-sidebar-foreground">
                      {fullName || email}
                    </p>
                    {fullName && email && (
                      <p className="truncate text-[11px] text-sidebar-foreground/50">{email}</p>
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
