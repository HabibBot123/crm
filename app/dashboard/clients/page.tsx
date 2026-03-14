"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  Mail,
  UserCheck,
  Users,
  UserX,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchClientsByOrganization,
  type ClientWithEnrollments,
} from "@/lib/services/clients"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Users }
> = {
  active: {
    label: "Active",
    color: "bg-success/10 text-success border-success/20",
    icon: UserCheck,
  },
  expired: {
    label: "Expired",
    color: "bg-muted text-muted-foreground border-border",
    icon: UserX,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: UserX,
  },
  paused: {
    label: "Paused",
    color: "bg-warning/10 text-warning-foreground border-warning/20",
    icon: Users,
  },
}

function getStatusConfig(status: string) {
  return statusConfig[status] ?? statusConfig.paused
}

function getInitials(display: string): string {
  if (display === "—" || !display.trim()) return "?"
  const parts = display.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return display.slice(0, 2).toUpperCase()
}

function formatCurrency(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ClientsPage() {
  const { supabase } = useAuth()
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientWithEnrollments | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 10

  const {
    data: clients = [],
    isLoading: dataLoading,
    error,
  } = useQuery({
    queryKey: ["clients", currentOrganization?.id],
    queryFn: () =>
      fetchClientsByOrganization(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.client_display.toLowerCase().includes(q) ||
        c.email_display.toLowerCase().includes(q)
    )
  }, [clients, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const isLoading = orgLoading || dataLoading

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to view clients.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Clients and enrollments linked to your offers
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-destructive">
              {(error as Error).message}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-6">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {clients.length === 0
                ? "No clients yet. Enrollments will appear here after purchases."
                : "No clients match your search."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 lg:hidden">
              {paginated.map((client) => {
                const config = getStatusConfig(client.status)
                return (
                  <button
                    key={client.clientKey}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(client.client_display)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {client.client_display}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.email_display}
                        </p>
                        {!client.has_account && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            No account yet
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 text-xs", config.color)}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>{formatCurrency(client.total_spent)}</span>
                      <span>
                        {client.enrollments.length} enrollment
                        {client.enrollments.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Total spent
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Enrollments
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Last started
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client) => {
                    const config = getStatusConfig(client.status)
                    const lastEnrollment = client.enrollments[0]
                    const lastExpiresAt = lastEnrollment?.enrollment_expires_at ?? null
                    return (
                      <tr
                        key={client.clientKey}
                        onClick={() => setSelectedClient(client)}
                        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(client.client_display)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {client.client_display}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {client.email_display}
                              </p>
                              {!client.has_account && (
                                <Badge variant="secondary" className="mt-0.5 text-[10px]">
                                  No account yet
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs capitalize", config.color)}
                          >
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCurrency(client.total_spent)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.enrollments.length}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lastEnrollment
                            ? formatDate(
                                lastEnrollment.enrollment_started_at
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lastExpiresAt
                            ? formatDate(lastExpiresAt)
                            : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {(page - 1) * perPage + 1}–
                    {Math.min(page * perPage, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Client Detail Sheet */}
      <Sheet
        open={!!selectedClient}
        onOpenChange={() => setSelectedClient(null)}
      >
        <SheetContent className="overflow-y-auto p-6 sm:max-w-md">
          <SheetHeader className="pb-1">
            <SheetTitle className="font-display">Client profile</SheetTitle>
            <SheetDescription>
              Enrollments and total amount spent
            </SheetDescription>
          </SheetHeader>
          {selectedClient && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {getInitials(selectedClient.client_display)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">
                    {selectedClient.client_display}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient.email_display}
                  </p>
                  {!selectedClient.has_account && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      No account yet
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">
                    Total spent
                  </p>
                  <p className="mt-2 text-lg font-bold text-foreground">
                    {formatCurrency(selectedClient.total_spent)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-2 text-xs capitalize",
                      getStatusConfig(selectedClient.status).color
                    )}
                  >
                    {getStatusConfig(selectedClient.status).label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">
                  Enrollments ({selectedClient.enrollments.length})
                </p>
                <ul className="space-y-3">
                  {selectedClient.enrollments.map((en) => (
                    <li
                      key={en.enrollment_id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {en.offer_title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            getStatusConfig(en.enrollment_status).color
                          )}
                        >
                          {en.enrollment_status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Started: {formatDate(en.enrollment_started_at)}
                        </span>
                        {en.enrollment_expires_at ? (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Expires: {formatDate(en.enrollment_expires_at)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            No expiry
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedClient.email_for_mailto && (
                <Button
                  size="sm"
                  className="mt-2 w-full gap-2"
                  asChild
                >
                  <a href={`mailto:${selectedClient.email_for_mailto}`}>
                    <Mail className="h-4 w-4" />
                    Send email
                  </a>
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
