"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Layers,
  MessageSquare,
  User,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { getInitials } from "@/components/dashboard/user-avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { OrgSwitcher } from "@/components/coached/org-switcher"
import { displayNameFromUser } from "@/lib/user-display"
import { isCoachedNavActive } from "@/lib/coached"

const hubNavItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Account", href: "/profile", icon: User },
]

const orgNavBase = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Spaces", href: "/s", icon: Layers },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Coaching", href: "/coaching", icon: Calendar },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Account", href: "/profile", icon: User },
]

export function CoachedSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isOrgApp } = useCoachedHost()
  const [collapsed, setCollapsed] = useState(false)

  const fullName = displayNameFromUser(user)
  const email = user?.email ?? null
  const userInitial = getInitials(fullName, email)
  const navItems = isOrgApp ? orgNavBase : hubNavItems

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
        <div
          className={cn(
            "flex min-h-14 min-w-0 border-b border-sidebar-border px-2 py-2",
            collapsed && isOrgApp
              ? "flex-col items-center gap-1"
              : "items-center justify-between gap-1"
          )}
        >
          {isOrgApp ? (
            <div className={cn("min-w-0", !collapsed && "flex-1")}>
              <OrgSwitcher collapsed={collapsed} />
            </div>
          ) : !collapsed ? (
            <Link href="/home" className="flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                C
              </span>
              <span className="font-display text-sm font-semibold text-sidebar-foreground">
                CoachStack
              </span>
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = isCoachedNavActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center gap-1">
            {user ? (
              <Link
                href="/profile"
                title={[fullName, email].filter(Boolean).join(" · ") || "Account"}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent",
                  pathname === "/profile" && "bg-sidebar-accent",
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
                    {fullName && email ? (
                      <p className="truncate text-[10px] text-sidebar-foreground/50">
                        {email}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Link>
            ) : null}
            <span className="shrink-0">
              <ThemeToggle />
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
