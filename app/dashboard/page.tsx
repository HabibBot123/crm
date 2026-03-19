"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DollarSign, Users, ShoppingCart, TrendingUp, MessageCircle, Package } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { StatCard } from "@/components/dashboard/stat-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { GreetingBanner } from "@/components/dashboard/greeting-banner"
import { EmptyState } from "@/components/dashboard/empty-state"
import { UserAvatar } from "@/components/dashboard/user-avatar"
import { Badge } from "@/components/ui/badge"

type RecentSale = {
  id: number
  created_at: string
  amount: number
  currency: string
  buyer_email: string | null
  user_full_name: string | null
  offer_title: string | null
}

type TopProduct = {
  product_id: number
  title: string
  type: string
  total_enrollments: number
}

type DashboardOverview = {
  organization_id: number
  total_products: number
  total_published_products: number
  total_offers: number
  total_enrollments: number
  active_enrollments: number
  total_revenue: number
  revenue_last_30_days: number
  total_clients: number
  active_students: number
  recent_sales: RecentSale[]
  top_products: TopProduct[]
  unassigned_coaching_count?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, supabase } = useAuth()
  const { currentOrganization, organizations, isLoading: orgLoading } = useCurrentOrganization()
  const currentOrgId = currentOrganization?.id ?? organizations[0]?.id ?? null

  useEffect(() => {
    if (isLoading || orgLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (organizations.length === 0) {
      router.replace("/create-organization")
    }
  }, [user, isLoading, orgLoading, organizations.length, router])

  const { data: overview } = useQuery({
    queryKey: ["dashboard-overview", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("dashboard_overview", { p_organization_id: currentOrgId })
        .single()
      if (error) throw new Error(error.message)
      return data as DashboardOverview
    },
  })

  const stats: DashboardOverview = overview ?? {
    organization_id: currentOrgId ?? 0,
    total_products: 0,
    total_published_products: 0,
    total_offers: 0,
    total_enrollments: 0,
    active_enrollments: 0,
    total_revenue: 0,
    revenue_last_30_days: 0,
    total_clients: 0,
    active_students: 0,
    recent_sales: [],
    top_products: [],
    unassigned_coaching_count: 0,
  }

  const recentSales = Array.isArray(stats.recent_sales) ? stats.recent_sales : []
  const topProducts = Array.isArray(stats.top_products) ? stats.top_products : []

  const conversionRate =
    stats.total_clients > 0
      ? Math.round((stats.active_students / stats.total_clients) * 1000) / 10
      : 0

  if (isLoading || !user || orgLoading || organizations.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Overview"
        subtitle="Your organization at a glance"
      />

      <GreetingBanner />

      {/* Coaching CTA — only when relevant */}
      {(stats.unassigned_coaching_count ?? 0) > 0 && (
        <Link href="/dashboard/coaching">
          <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {stats.unassigned_coaching_count} coaching
                  {stats.unassigned_coaching_count !== 1 ? "s" : ""} to assign
                </p>
                <p className="text-xs text-muted-foreground">
                  Assign a coach to each pack to track sessions
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary">View →</span>
          </div>
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${(stats.total_revenue / 100).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} €`}
          change={0}
          icon={DollarSign}
          iconColor="primary"
        />
        <StatCard
          title="Total Clients"
          value={stats.total_clients.toString()}
          change={0}
          icon={Users}
          iconColor="success"
        />
        <StatCard
          title="Total Sales"
          value={stats.total_enrollments.toString()}
          change={0}
          icon={ShoppingCart}
          iconColor="warning"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={0}
          icon={TrendingUp}
          iconColor="accent"
        />
      </div>

      {/* Recent Sales + Top Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent Sales"
          action={
            <Link
              href="/dashboard/clients"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          }
        >
          {recentSales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No sales yet"
              description="Sales will appear here after purchases."
            />
          ) : (
            <ul className="space-y-4">
              {recentSales.map((sale) => {
                const name = sale.user_full_name || sale.buyer_email || "Unknown client"
                return (
                  <li key={sale.id} className="flex items-center gap-3">
                    <UserAvatar
                      name={sale.user_full_name}
                      email={sale.buyer_email}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {sale.offer_title && (
                        <p className="truncate text-xs text-muted-foreground">
                          {sale.offer_title}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      +{(sale.amount / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {sale.currency.toUpperCase()}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Top Products"
          action={
            <Link
              href="/dashboard/products"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          }
        >
          {topProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No enrollments yet"
              description="Products with enrollments will appear here."
            />
          ) : (
            <ul className="space-y-4">
              {topProducts.map((product) => (
                <li key={product.product_id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {product.type === "course"
                      ? "CR"
                      : product.type === "coaching"
                        ? "CO"
                        : "PR"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {product.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.total_enrollments} enrollment
                      {product.total_enrollments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                    {product.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
