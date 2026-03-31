"use client"

import Link from "next/link"
import { Home, User, Users, BookOpen, GraduationCap } from "lucide-react"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const desktopNavItems = [
  { label: "Home", href: "/coached", icon: Home },
  { label: "Coaches", href: "/coached/coaches", icon: Users },
  { label: "My Programs", href: "/coached/courses", icon: BookOpen },
  { label: "Profile", href: "/coached/profile", icon: User },
]

export function CoachedHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-card/95 backdrop-blur-sm md:block lg:hidden">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-6">
        <Link href="/coached" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </div>
          <span className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
            CoachStack
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">Student</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {desktopNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/coached" && pathname.startsWith(item.href))
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

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
