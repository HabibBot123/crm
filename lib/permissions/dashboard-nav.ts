import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Package,
  Tag,
  Users,
  FileText,
  UserPlus,
  Settings,
  Palette,
  MessageCircle,
  ClipboardList,
  FormInput,
  Wallet,
  Receipt,
  BarChart3,
  Megaphone,
} from "lucide-react"
import type { OrgCapability } from "@/lib/permissions/capabilities"

export type DashboardNavVisibility = {
  can: (capability: OrgCapability) => boolean
  /** True when org is solo and the feature is Team-only. */
  requiresTeamPlan: boolean
  /** While capabilities load, hide gated items to avoid flashing unauthorized links. */
  capabilitiesLoading: boolean
}

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** If omitted, item is always visible. */
  isVisible?: (ctx: DashboardNavVisibility) => boolean
}

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

function gated(
  ctx: DashboardNavVisibility,
  check: (can: DashboardNavVisibility["can"]) => boolean
): boolean {
  if (ctx.capabilitiesLoading) return false
  return check(ctx.can)
}

/** Shared dashboard nav — sidebar groups + flat mobile list. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    label: "Home",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        isVisible: (ctx) => gated(ctx, (can) => can("analytics.view")),
      },
    ],
  },
  {
    label: "Pipeline",
    items: [
      {
        label: "CRM",
        href: "/dashboard/crm",
        icon: ClipboardList,
        isVisible: (ctx) =>
          gated(ctx, (can) => can("crm.leads.view") || can("crm.leads.view_own")),
      },
      {
        label: "Forms",
        href: "/dashboard/crm/forms",
        icon: FormInput,
        isVisible: (ctx) =>
          gated(
            ctx,
            (can) =>
              can("forms.view") ||
              can("forms.manage") ||
              can("forms.links.view_own") ||
              can("forms.links.manage_others")
          ),
      },
      {
        label: "Campaigns",
        href: "/dashboard/campaigns",
        icon: Megaphone,
        isVisible: (ctx) => gated(ctx, (can) => can("campaigns.manage")),
      },
      {
        label: "Sales",
        href: "/dashboard/sales",
        icon: Receipt,
        isVisible: (ctx) => gated(ctx, (can) => can("sales.view")),
      },
      {
        label: "Payouts",
        href: "/dashboard/crm/commissions",
        icon: Wallet,
        isVisible: (ctx) =>
          !ctx.requiresTeamPlan &&
          gated(ctx, (can) => can("commissions.view_own") || can("commissions.view_all")),
      },
    ],
  },
  {
    label: "Delivery",
    items: [
      {
        label: "Clients",
        href: "/dashboard/clients",
        icon: Users,
        isVisible: (ctx) => gated(ctx, (can) => can("clients.view")),
      },
      {
        label: "Coaching",
        href: "/dashboard/coaching",
        icon: MessageCircle,
        isVisible: (ctx) => gated(ctx, (can) => can("coaching.view")),
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        label: "Offers",
        href: "/dashboard/offers",
        icon: Tag,
        isVisible: (ctx) => gated(ctx, (can) => can("catalog.manage")),
      },
      {
        label: "Products",
        href: "/dashboard/products",
        icon: Package,
        isVisible: (ctx) => gated(ctx, (can) => can("catalog.manage")),
      },
      {
        label: "Content",
        href: "/dashboard/content",
        icon: FileText,
        isVisible: (ctx) => gated(ctx, (can) => can("catalog.manage")),
      },
      {
        label: "Store page",
        href: "/dashboard/branding",
        icon: Palette,
        isVisible: (ctx) => gated(ctx, (can) => can("org.settings")),
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        label: "Team",
        href: "/dashboard/team",
        icon: UserPlus,
        isVisible: (ctx) => !ctx.requiresTeamPlan,
      },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

export function filterDashboardNavGroups(
  groups: DashboardNavGroup[],
  ctx: DashboardNavVisibility
): DashboardNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (item.isVisible ? item.isVisible(ctx) : true)),
    }))
    .filter((group) => group.items.length > 0)
}

export function flattenDashboardNav(groups: DashboardNavGroup[]): DashboardNavItem[] {
  return groups.flatMap((group) => group.items)
}

export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true
  if (href === "/dashboard") return false
  if (href === "/dashboard/crm") {
    return (
      pathname.startsWith("/dashboard/crm/") &&
      !pathname.startsWith("/dashboard/crm/forms") &&
      !pathname.startsWith("/dashboard/crm/commissions")
    )
  }
  return pathname.startsWith(href)
}
