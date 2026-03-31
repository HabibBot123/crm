"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  FileText,
  UserPlus,
  Settings,
  Menu,
  X,
  Palette,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { getInitials } from "@/components/dashboard/user-avatar"

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Offers", href: "/dashboard/offers", icon: Tag },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Content", href: "/dashboard/content", icon: FileText },
  { label: "Branding", href: "/dashboard/branding", icon: Palette },
  { label: "Team", href: "/dashboard/team", icon: UserPlus },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { currentOrganization } = useCurrentOrganization()

  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() || null
  const email = user?.email ?? null
  const userInitial = getInitials(fullName, email)

  const roleLine = currentOrganization
    ? `${currentOrganization.member_role ? currentOrganization.member_role.charAt(0).toUpperCase() + currentOrganization.member_role.slice(1) : "Member"} of ${currentOrganization.name}`
    : null

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
          C
        </span>
        <span className="truncate font-display text-sm font-semibold text-foreground">CoachStack</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-64 flex-col p-0">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            {user && (
              <div className="border-t border-border p-4">
                <Link
                  href="/dashboard/account"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    pathname === "/dashboard/account"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {userInitial}
                  </span>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate font-medium text-foreground">{fullName || email || "Account"}</p>
                    {roleLine && (
                      <p className="truncate text-xs text-muted-foreground">{roleLine}</p>
                    )}
                  </div>
                </Link>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
