"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Home", href: "/student", icon: Home },
  { label: "My Courses", href: "/student/courses", icon: BookOpen },
  { label: "Profile", href: "/student/profile", icon: User },
]

export function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom md:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== "/student" && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
