"use client"

import { useState } from "react"
import { DollarSign, Download, Search, Filter, MoreHorizontal, Eye, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { sales } from "@/lib/mock-data"
import { StatCard } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  refunded: "bg-destructive/10 text-destructive border-destructive/20",
}

export default function SalesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<"date" | "amount">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedSale, setSelectedSale] = useState<typeof sales[0] | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 5

  const filtered = sales
    .filter((s) => {
      const matchesSearch =
        s.clientName.toLowerCase().includes(search.toLowerCase()) ||
        s.orderId.toLowerCase().includes(search.toLowerCase()) ||
        s.product.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortField === "date") {
        return sortDir === "desc"
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount
    })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const totalRevenue = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.amount, 0)
  const pendingAmount = sales.filter((s) => s.status === "pending").reduce((sum, s) => sum + s.amount, 0)
  const refundedAmount = sales.filter((s) => s.status === "refunded").reduce((sum, s) => sum + s.amount, 0)

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track all transactions and revenue</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Completed Revenue" value={`$${totalRevenue.toLocaleString()}`} change={18.2} icon={DollarSign} />
        <StatCard title="Pending" value={`$${pendingAmount.toLocaleString()}`} change={-5.3} icon={DollarSign} />
        <StatCard title="Refunded" value={`$${refundedAmount.toLocaleString()}`} change={-2.1} icon={RotateCcw} />
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, order ID, or product..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort("amount")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Amount
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <button
                  onClick={() => toggleSort("date")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((sale) => (
              <tr key={sale.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{sale.orderId}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{sale.clientName}</p>
                    <p className="text-xs text-muted-foreground">{sale.clientEmail}</p>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{sale.product}</td>
                <td className="px-4 py-3 font-semibold text-foreground">${sale.amount}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn("text-xs capitalize", statusColors[sale.status])}
                  >
                    {sale.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedSale(sale)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Issue refund
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Order {selectedSale?.orderId}</DialogTitle>
            <DialogDescription>Transaction details</DialogDescription>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium text-foreground">{selectedSale.clientName}</p>
                  <p className="text-xs text-muted-foreground">{selectedSale.clientEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Product</p>
                  <p className="text-sm font-medium text-foreground">{selectedSale.product}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-lg font-bold text-foreground">${selectedSale.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm font-medium text-foreground">{selectedSale.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(selectedSale.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("mt-1 text-xs capitalize", statusColors[selectedSale.status])}>
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>
              {selectedSale.status === "completed" && (
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Issue Refund
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
