"use client"

import { useState } from "react"
import { Search, Filter, MoreHorizontal, Mail, Tag, Users, UserCheck, UserX, ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { clients } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; color: string; icon: typeof Users }> = {
  active: { label: "Active", color: "bg-success/10 text-success border-success/20", icon: UserCheck },
  inactive: { label: "Inactive", color: "bg-muted text-muted-foreground border-border", icon: Users },
  churned: { label: "Churned", color: "bg-destructive/10 text-destructive border-destructive/20", icon: UserX },
}

export default function ClientsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [selectedClient, setSelectedClient] = useState<typeof clients[0] | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 5

  const allTags = Array.from(new Set(clients.flatMap((c) => c.tags)))

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    const matchesTag = tagFilter === "all" || c.tags.includes(tagFilter)
    return matchesSearch && matchesStatus && matchesTag
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const statCounts = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    inactive: clients.filter((c) => c.status === "inactive").length,
    churned: clients.filter((c) => c.status === "churned").length,
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your client relationships and track engagement</p>
        </div>
        <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries({ total: "All", active: "Active", inactive: "Inactive", churned: "Churned" }).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key === "total" ? "all" : key)}
            className={cn(
              "rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30",
              (key === "total" && statusFilter === "all") || statusFilter === key
                ? "border-primary/50 ring-1 ring-primary/20"
                : ""
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground font-display">
              {statCounts[key as keyof typeof statCounts]}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-36">
            <Tag className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Cards (mobile) / Table (desktop) */}
      <div className="mt-6">
        {/* Mobile cards */}
        <div className="space-y-3 lg:hidden">
          {paginated.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{client.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                </div>
                <Badge variant="outline" className={cn("text-xs", statusConfig[client.status].color)}>
                  {statusConfig[client.status].label}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>${client.revenue} revenue</span>
                <span>{client.productsOwned} products</span>
                <div className="ml-auto flex gap-1">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client) => (
                <tr key={client.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{client.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-xs", statusConfig[client.status].color)}>
                      {statusConfig[client.status].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {client.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client.assignedTo}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">${client.revenue}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(client.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                        <DropdownMenuItem onClick={() => setSelectedClient(client)}>
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Remove client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">Client Profile</SheetTitle>
            <SheetDescription>View and manage client details</SheetDescription>
          </SheetHeader>
          {selectedClient && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{selectedClient.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-foreground">{selectedClient.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {selectedClient.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" />
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Tag
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="mt-1 text-lg font-bold text-foreground">${selectedClient.revenue}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Products Owned</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{selectedClient.productsOwned}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={cn("mt-1 text-xs", statusConfig[selectedClient.status].color)}>
                    {statusConfig[selectedClient.status].label}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{selectedClient.assignedTo}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {new Date(selectedClient.joinedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
