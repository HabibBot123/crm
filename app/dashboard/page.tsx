"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Line, LineChart } from "recharts"
import { StatCard } from "@/components/dashboard/stat-card"
import { dashboardStats, revenueData, sales, products } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const organizations = (user?.app_metadata?.organizations ?? []) as { organization_id: number }[]

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
        <p className="mt-1 text-sm text-muted-foreground">Welcome back, Alex. Here is your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`$${(dashboardStats.totalRevenue / 1000).toFixed(1)}K`}
          change={dashboardStats.revenueChange}
          icon={DollarSign}
        />
        <StatCard
          title="Total Clients"
          value={dashboardStats.totalClients.toString()}
          change={dashboardStats.clientsChange}
          icon={Users}
        />
        <StatCard
          title="Total Sales"
          value={dashboardStats.totalSales.toString()}
          change={dashboardStats.salesChange}
          icon={ShoppingCart}
        />
        <StatCard
          title="Conversion Rate"
          value={`${dashboardStats.conversionRate}%`}
          change={dashboardStats.conversionChange}
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
              <p className="text-xs text-muted-foreground">Monthly revenue overview</p>
            </div>
            <Badge variant="secondary" className="text-xs">Last 6 months</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales Trend */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-3">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground">Sales Trend</h3>
            <p className="text-xs text-muted-foreground">Monthly sales count</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: 12,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Sales + Top Products */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent sales */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Recent Sales</h3>
          <div className="mt-4 space-y-4">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {sale.clientName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{sale.clientName}</p>
                  <p className="text-xs text-muted-foreground">{sale.clientEmail}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">+${sale.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Top Products</h3>
          <div className="mt-4 space-y-4">
            {products.filter(p => p.status === "published").map((product) => (
              <div key={product.id} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                  {product.type === "course" ? "CR" : product.type === "ebook" ? "EB" : "CO"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.studentsCount} students</p>
                </div>
                <Badge variant="secondary" className="text-xs capitalize">{product.type}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
