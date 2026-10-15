"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { toast } from "sonner"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useCommunitySpaceMembersPage,
  useRemoveCommunitySpaceMemberMutation,
} from "@/hooks/use-community"
import { MemberCard } from "@/components/coached/member-card"
import { SpaceMembersAddDialog } from "@/components/coached/space-members-add-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { LoadingGrid } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const PAGE_SIZE = 24

export default function SpaceMembersPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>
}) {
  const { spaceSlug } = use(params)
  const { orgSpaces, org, isLoading } = useCurrentCoachedOrg()
  const space = orgSpaces.find((s) => s.slug === spaceSlug) ?? null
  const { can } = useOrgCapabilities({
    organizationId: org?.organization_id ?? null,
  })
  const canManage = can("community.manage")

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  function applySearch() {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const membersQuery = useCommunitySpaceMembersPage(space?.id ?? null, {
    q: search,
    page,
    pageSize: PAGE_SIZE,
  })
  const removeMutation = useRemoveCommunitySpaceMemberMutation(space?.id ?? null)

  if (isLoading) {
    return <LoadingGrid count={8} />
  }

  if (!space) {
    return (
      <EmptyState
        icon={Users}
        title="Space not found"
        action={
          <Button size="sm" variant="secondary" asChild>
            <Link href="/s">All spaces</Link>
          </Button>
        }
      />
    )
  }

  const data = membersQuery.data
  const members = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleRemove(userId: string) {
    try {
      await removeMutation.mutateAsync(userId)
      toast.success("Member removed")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not remove member"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        back={`/s?space=${encodeURIComponent(space.slug)}`}
      >
        {canManage && org ? (
          <SpaceMembersAddDialog
            spaceId={space.id}
            organizationId={org.organization_id}
          />
        ) : null}
      </PageHeader>

      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="w-full pl-9"
          placeholder="Search by name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch()
          }}
        />
      </div>

      {membersQuery.isLoading ? (
        <LoadingGrid count={8} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No matches" : "No members yet"}
          description={
            search
              ? "Try another search."
              : canManage
                ? "Add a member to this space."
                : "Members appear once synced or invited into this space."
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((m) => (
              <li key={m.id}>
                <MemberCard
                  userId={m.user_id}
                  fullName={m.full_name ?? null}
                  avatarUrl={m.avatar_url}
                  role={m.role}
                  onRemove={
                    canManage
                      ? () => void handleRemove(m.user_id)
                      : undefined
                  }
                  removePending={removeMutation.isPending}
                />
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || membersQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || membersQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
