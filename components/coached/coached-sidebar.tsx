"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Users,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = [
  { label: "Home", href: "/coached", icon: Home },
  { label: "Coaches", href: "/coached/coaches", icon: Users },
  { label: "My Programs", href: "/coached/courses", icon: BookOpen },
  { label: "Profile", href: "/coached/profile", icon: User },
]

function getUserDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string | null } | null): string {
  if (!user) return "User"
  const name =
    (user.user_metadata?.full_name as string) ??
    (user.user_metadata?.name as string) ??
    (user.email?.split("@")[0] ?? "User")
  return name
}

export function CoachedSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const displayName = getUserDisplayName(user)
  const email = user?.email ?? ""
  const initial = displayName.charAt(0).toUpperCase() || "?"

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <>
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
        <div className="flex h-16 min-w-0 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pl-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground"
                aria-hidden
              >
                {initial}
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-col gap-0.5 truncate py-2">
                  <span className="truncate text-sm font-medium text-sidebar-foreground">
                    {displayName}
                  </span>
                  {email ? (
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/coached" && pathname.startsWith(item.href))
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

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between">
            {!collapsed && <ThemeToggle />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
