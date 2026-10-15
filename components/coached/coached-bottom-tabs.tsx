"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Calendar,
  Home,
  Layers,
  MessageSquare,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { isCoachedNavActive } from "@/lib/coached"

const hubTabs = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Account", href: "/profile", icon: User },
]

const orgTabs = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Spaces", href: "/s", icon: Layers },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Coach", href: "/coaching", icon: Calendar },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Account", href: "/profile", icon: User },
]

export function CoachedBottomTabs() {
  const pathname = usePathname()
  const { isOrgApp } = useCoachedHost()
  const tabs = isOrgApp ? orgTabs : hubTabs

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = isCoachedNavActive(pathname, tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground active:bg-muted/80"
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
