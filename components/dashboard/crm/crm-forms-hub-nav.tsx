"use client"

import { usePathname, useRouter } from "next/navigation"
import { CircleDot, FileText, Link2, ListFilter } from "lucide-react"
import { NavList, type NavListItem } from "@/components/dashboard/nav-list"

type HubSection =
  | "/dashboard/crm/forms"
  | "/dashboard/crm/forms/fields"
  | "/dashboard/crm/forms/statuses"
  | "/dashboard/crm/forms/links"

const hubItems: NavListItem<HubSection>[] = [
  { id: "/dashboard/crm/forms", label: "Forms", icon: FileText },
  { id: "/dashboard/crm/forms/fields", label: "Fields", icon: ListFilter },
  { id: "/dashboard/crm/forms/statuses", label: "Statuses", icon: CircleDot },
  { id: "/dashboard/crm/forms/links", label: "Share links", icon: Link2 },
]

function resolveHubSection(pathname: string): HubSection {
  const ranked = [...hubItems].sort((a, b) => b.id.length - a.id.length)
  for (const item of ranked) {
    if (item.id === "/dashboard/crm/forms") {
      if (pathname === item.id) return item.id
      continue
    }
    if (pathname.startsWith(item.id)) return item.id
  }
  return "/dashboard/crm/forms"
}

export function CrmFormsHubNav() {
  const pathname = usePathname()
  const router = useRouter()
  const value = resolveHubSection(pathname)

  return (
    <NavList
      items={hubItems}
      value={value}
      onChange={(href) => {
        router.push(href)
      }}
    />
  )
}
