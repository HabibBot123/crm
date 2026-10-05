"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, FileText, Link2, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"

const hubItems = [
  { href: "/dashboard/crm/forms", label: "Forms", icon: FileText, exact: true },
  { href: "/dashboard/crm/forms/fields", label: "Fields", icon: ListFilter, exact: false },
  {
    href: "/dashboard/crm/forms/business-units",
    label: "Business units",
    icon: Building2,
    exact: false,
  },
  { href: "/dashboard/crm/forms/links", label: "Share links", icon: Link2, exact: false },
]

export function CrmFormsHubNav() {
  const pathname = usePathname()

  return (
    <nav className="w-44 shrink-0 space-y-1">
      {hubItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
