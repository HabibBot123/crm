"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
// Charts (kept for future use; currently no charts rendered)
// import {
//   Bar,
//   BarChart,
//   ResponsiveContainer,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Line,
//   LineChart,
// } from "recharts"
import { StatCard } from "@/components/dashboard/stat-card"
import { revenueData } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading, supabase } = useAuth()
  const organizations = (user?.app_metadata?.organizations ?? []) as { organization_id: number }[]
  const currentOrgId = organizations[0]?.organization_id ?? null

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (organizations.length === 0) {
      router.replace("/create-organization")
    }
  }, [user, isLoading, organizations.length, router])

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
  }

  const recentSales = Array.isArray(stats.recent_sales) ? stats.recent_sales : []
  const topProducts = Array.isArray(stats.top_products) ? stats.top_products : []

  const conversionRate =
    stats.total_clients > 0 ? Math.round((stats.active_students / stats.total_clients) * 1000) / 10 : 0

  if (isLoading || !user || organizations.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back. Here is the overview for your organization.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${(stats.total_revenue / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`}
          change={0}
          icon={DollarSign}
        />
        <StatCard
          title="Total Clients"
          value={stats.total_clients.toString()}
          change={0}
          icon={Users}
        />
        <StatCard
          title="Total Sales"
          value={stats.total_enrollments.toString()}
          change={0}
          icon={ShoppingCart}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={0}
          icon={TrendingUp}
        />
      </div>

      {/* Recent Sales + Top Products */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent sales */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Recent Sales</h3>
          <div className="mt-4 space-y-4">
            {recentSales.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sales yet.</p>
            ) : (
              recentSales.map((sale) => {
                const name = sale.user_full_name || sale.buyer_email || "Unknown client"
                const initials = name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0]?.toUpperCase())
                  .join("")
                  .slice(0, 2)

                return (
                  <div key={sale.id} className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {initials || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {sale.offer_title && (
                        <p className="text-xs text-muted-foreground">{sale.offer_title}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      +{(sale.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                      {sale.currency.toUpperCase()}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Top Products</h3>
          <div className="mt-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No products with enrollments yet.</p>
            ) : (
              topProducts.map((product) => (
                <div key={product.product_id} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                    {product.type === "course" ? "CR" : product.type === "coaching" ? "CO" : "PR"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.total_enrollments} enrollment
                      {product.total_enrollments !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {product.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
