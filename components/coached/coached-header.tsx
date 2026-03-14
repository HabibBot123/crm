"use client"

import Link from "next/link"
import { Bell, Home, User, Users, BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 w-full items-center justify-between px-4">
        <Link href="/coached" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">FP</span>
          </div>
          <span className="text-sm font-bold text-foreground">FitPro Coaching</span>
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
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
