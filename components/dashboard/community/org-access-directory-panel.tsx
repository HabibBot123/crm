"use client"

import { useState } from "react"
import { Search, Users, X } from "lucide-react"
import { useOrgAccessDirectoryPage } from "@/hooks/use-community"
import type { OrgAccessOrigin } from "@/schemas/community.schema"
import {
  emptyOrgMembersFilters,
  OrgMembersFiltersPopover,
  originFilterLabel,
  type OrgMembersFilterValues,
} from "@/components/coached/org-members-filters-popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const PAGE_SIZE = 25

const ORIGIN_LABEL: Record<OrgAccessOrigin, string> = {
  staff: "Staff",
  enrollment: "Enrollment",
  community: "Community",
}

function initials(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

type OrgAccessDirectoryPanelProps = {
  organizationId: number
}

export function OrgAccessDirectoryPanel({
  organizationId,
}: OrgAccessDirectoryPanelProps) {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<OrgMembersFilterValues>(
    emptyOrgMembersFilters
  )
  const [page, setPage] = useState(1)

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  function applyFilters(next: OrgMembersFilterValues) {
    setFilters(next)
    setPage(1)
  }

  function removeOrigin(origin: OrgAccessOrigin) {
    applyFilters({
      origins: filters.origins.filter((item) => item !== origin),
    })
  }

  const hasActiveFilters = filters.origins.length > 0

  const directoryQuery = useOrgAccessDirectoryPage(organizationId, {
    q: search,
    origins: filters.origins,
    page,
    pageSize: PAGE_SIZE,
  })

  const items = directoryQuery.data?.items ?? []
  const total = directoryQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-full pl-9 pr-11"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch()
            }}
          />
          <OrgMembersFiltersPopover values={filters} onApply={applyFilters} />
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {filters.origins.map((value) => (
              <Button
                key={value}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => removeOrigin(value)}
              >
                {originFilterLabel(value)}
                <X className="h-3 w-3" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {directoryQuery.isLoading ? (
        <LoadingRows count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            search || hasActiveFilters ? "No matches" : "No members yet"
          }
          description={
            search || hasActiveFilters
              ? "Try another search or clear the filters."
              : "People appear when they enroll, join the team, or enter a space."
          }
        />
      ) : (
        <SectionCard
          noPadding
          footer={
            totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || directoryQuery.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages || directoryQuery.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Origin
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.user_id} className="hover:bg-accent/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          {row.avatar_url ? (
                            <AvatarImage src={row.avatar_url} alt="" />
                          ) : null}
                          <AvatarFallback className="bg-muted text-xs font-semibold">
                            {initials(row.full_name, row.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {row.full_name?.trim() || "Member"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.email || "None"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.origins.map((o) => (
                          <Badge
                            key={o}
                            variant="secondary"
                            className="text-[10px] font-normal normal-case"
                          >
                            {ORIGIN_LABEL[o]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
