"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { MessageCircle, Package, ShoppingCart, Users, TrendingUp, DollarSign } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { StatCard } from "@/components/dashboard/stat-card"
import { SectionCard } from "@/components/dashboard/section-card"
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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const firstName = (user?.user_metadata?.full_name as string | undefined)
    ?.trim()
    .split(" ")[0] ?? null

  return (
    <div className="space-y-6 p-6 lg:p-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {firstName ? `Good to see you, ${firstName}` : "Overview"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {currentOrganization?.name && (
              <span className="font-medium text-foreground">{currentOrganization.name} · </span>
            )}
            {today}
          </p>
        </div>
        {(stats.unassigned_coaching_count ?? 0) > 0 && (
          <Link href="/dashboard/coaching">
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm transition-colors hover:bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">
                You have {stats.unassigned_coaching_count} coaching to assign
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${(stats.total_revenue / 100).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })} €`}
          change={0}
          borderColor="primary"
        />
        <StatCard
          title="Total Clients"
          value={stats.total_clients.toString()}
          change={0}
          borderColor="success"
        />
        <StatCard
          title="Total Sales"
          value={stats.total_enrollments.toString()}
          change={0}
          borderColor="warning"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={0}
          borderColor="accent"
        />
      </div>

      {/* 65/35 split */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">

        {/* Left — Recent Sales table */}
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
            <ul className="space-y-1">
              {recentSales.map((sale) => {
                const name = sale.user_full_name || sale.buyer_email || "Unknown"
                return (
                  <li
                    key={sale.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <UserAvatar
                      name={sale.user_full_name}
                      email={sale.buyer_email}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {sale.offer_title && (
                        <p className="truncate text-xs text-muted-foreground">{sale.offer_title}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        +{(sale.amount / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {sale.currency.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        {/* Right — Top Products */}
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
            <ul className="space-y-3">
              {topProducts.map((product, i) => (
                <li key={product.product_id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
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
