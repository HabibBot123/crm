"use client"

import { useState } from "react"
import {
  Search,
  Mail,
  UserCheck,
  Users,
  UserX,
  Calendar,
  Package,
} from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useClients, useClientDetail, type ClientSummary } from "@/hooks/use-clients"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
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
import { cn, formatAmountFromCents } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"

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
  return formatAmountFromCents(amountCents, "EUR") ?? "—"
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const perPage = 10

export default function ClientsPage() {
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const applySearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const { data, isLoading: dataLoading, error } = useClients({
    organizationId: currentOrganization?.id ?? null,
    page,
    pageSize: perPage,
    search,
  })

  const { data: clientDetail, isLoading: detailLoading } = useClientDetail({
    organizationId: currentOrganization?.id ?? null,
    clientKey: selectedClientKey,
  })

  const items = data.items
  const total = data.total
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const isLoading = orgLoading || dataLoading

  if (!currentOrganization && !orgLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Select an organization to view clients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Clients"
        subtitle="Clients and enrollments linked to your offers"
      />

      <div className="flex items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="pl-9"
          />
        </div>
        <Button type="button" variant="secondary" onClick={applySearch}>
          Search
        </Button>
      </div>

      {isLoading ? (
        <SectionCard><LoadingRows count={5} /></SectionCard>
      ) : error ? (
        <SectionCard>
          <p className="text-center text-sm text-destructive">{(error as Error).message}</p>
        </SectionCard>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={total === 0 && !search.trim() ? "No clients yet" : "No clients match your search"}
          description={total === 0 && !search.trim() ? "Enrollments will appear here after purchases." : undefined}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {items.map((client: ClientSummary) => {
              const config = getStatusConfig(client.status)
              const emailDisplay = client.client_email ?? client.buyer_email ?? "—"
              return (
                <button
                  key={client.client_key}
                  type="button"
                  onClick={() => setSelectedClientKey(client.client_key)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(client.client_display)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{client.client_display}</p>
                      <p className="truncate text-xs text-muted-foreground">{emailDisplay}</p>
                      {!client.user_id && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">No account yet</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-xs", config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{formatCurrency(client.total_spent)}</span>
                    <span>{client.enrollment_count} enrollment{client.enrollment_count !== 1 ? "s" : ""}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Desktop table */}
          <SectionCard
            noPadding
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <PaginationSummary page={page} pageSize={perPage} total={total} />
                <PaginationControls page={page} pageSize={perPage} total={total} onPageChange={setPage} />
              </div>
            }
          >
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total spent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrollments</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">First joined</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last expires</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((client: ClientSummary) => {
                    const config = getStatusConfig(client.status)
                    const emailDisplay = client.client_email ?? client.buyer_email ?? "—"
                    return (
                      <tr
                        key={client.client_key}
                        onClick={() => setSelectedClientKey(client.client_key)}
                        className="cursor-pointer transition-colors hover:bg-accent/60"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(client.client_display)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{client.client_display}</p>
                              <p className="text-xs text-muted-foreground">{emailDisplay}</p>
                              {!client.user_id && (
                                <Badge variant="secondary" className="mt-0.5 text-[10px]">No account yet</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs capitalize", config.color)}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatCurrency(client.total_spent)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{client.enrollment_count}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.first_enrollment_started_at ? formatDate(client.first_enrollment_started_at) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {client.last_enrollment_expires_at ? formatDate(client.last_enrollment_expires_at) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      {/* Client Detail Sheet */}
      <Sheet
        open={!!selectedClientKey}
        onOpenChange={(open) => !open && setSelectedClientKey(null)}
      >
        <SheetContent className="overflow-y-auto p-6 sm:max-w-md">
          <SheetHeader className="pb-1">
            <SheetTitle className="font-display">Client profile</SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <div className="space-y-4 pt-4">
              <div className="h-14 animate-pulse rounded-lg bg-muted" />
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : clientDetail ? (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                    {getInitials(clientDetail.client_display)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">
                    {clientDetail.client_display}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {clientDetail.email_display}
                  </p>
                  {!clientDetail.has_account && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      No account yet
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">
                  Enrollments ({clientDetail.enrollments.length})
                </p>
                <ul className="space-y-3">
                  {clientDetail.enrollments.map((en) => (
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

              {clientDetail.email_for_mailto && (
                <Button
                  size="sm"
                  className="mt-2 w-full gap-2"
                  asChild
                >
                  <a href={`mailto:${clientDetail.email_for_mailto}`}>
                    <Mail className="h-4 w-4" />
                    Send email
                  </a>
                </Button>
              )}
            </div>
          ) : selectedClientKey ? (
            <p className="pt-4 text-sm text-muted-foreground">
              Client not found.
            </p>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
