"use client"

import Link from "next/link"
import { GraduationCap, Home, User } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { OrgSwitcher } from "@/components/coached/org-switcher"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { cn } from "@/lib/utils"

const hubNavItems = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Account", href: "/profile", icon: User },
]

export function CoachedHeader() {
  const pathname = usePathname()
  const { isOrgApp } = useCoachedHost()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:px-6">
        {isOrgApp ? (
          <div className="min-w-0 flex-1">
            <OrgSwitcher className="max-w-[16rem]" />
          </div>
        ) : (
          <>
            <Link href="/home" className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="h-4 w-4" aria-hidden />
              </div>
              <span className="truncate font-display text-sm font-semibold tracking-tight">
                CoachStack
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {hubNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/home" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </>
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
