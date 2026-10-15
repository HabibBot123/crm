"use client"

import { useState } from "react"
import { Archive, ExternalLink, Layers, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { OrgAccessDirectoryPanel } from "@/components/dashboard/community/org-access-directory-panel"
import { EditSpaceDialog } from "@/components/coached/edit-space-dialog"
import {
  SpaceOfferRulesFields,
  offerRulesFromDrafts,
  type OfferRuleDraft,
} from "@/components/community/space-offer-rules-fields"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useArchiveCommunitySpaceMutation,
  useCreateCommunitySpaceMutation,
  useOrgCommunitySpaces,
} from "@/hooks/use-community"
import { buildOrgAppOrigin } from "@/lib/coached-host"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { NoAccessState } from "@/components/dashboard/no-access-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CommunitySpace } from "@/schemas/community.schema"

type CommunityTab = "spaces" | "members"

function spaceAppHref(orgSlug: string, spaceSlug: string): string {
  if (typeof window === "undefined") return "#"
  const origin = buildOrgAppOrigin({
    orgSlug,
    protocol: window.location.protocol.replace(":", ""),
    currentHost: window.location.host,
  })
  return `${origin}/s?space=${encodeURIComponent(spaceSlug)}`
}

export default function CommunityPage() {
  const { currentOrganization, isLoading: orgLoading } = useCurrentOrganization()
  const { can } = useOrgCapabilities()
  const canManage = can("community.manage")
  const canView =
    canManage || can("community.moderate") || can("community.view_stats")

  const orgId = currentOrganization?.id ?? null
  const orgSlug = currentOrganization?.slug ?? null
  const spacesQuery = useOrgCommunitySpaces(canView ? orgId : null)
  const createMutation = useCreateCommunitySpaceMutation(orgId)
  const archiveMutation = useArchiveCommunitySpaceMutation(orgId)

  const [tab, setTab] = useState<CommunityTab>("spaces")
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [offerRules, setOfferRules] = useState<Record<number, OfferRuleDraft>>(
    {}
  )

  if (orgLoading) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        <LoadingRows count={4} />
      </div>
    )
  }

  if (!canView) {
    return (
      <NoAccessState
        title="Community"
        description="You don't have permission to view community spaces with your role."
      />
    )
  }

  const spaces = spacesQuery.data ?? []

  function resetCreateForm() {
    setName("")
    setDescription("")
    setOfferRules({})
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    try {
      await createMutation.mutateAsync({
        name: trimmed,
        description: description.trim() || null,
        sync_clients: true,
        offer_rules: offerRulesFromDrafts(offerRules),
      })
      toast.success("Space created")
      setCreateOpen(false)
      resetCreateForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create space"
      toast.error(message)
    }
  }

  async function handleArchive(space: CommunitySpace) {
    try {
      await archiveMutation.mutateAsync(space.id)
      toast.success("Space archived")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Archive failed"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title="Community" subtitle="Spaces and organization directory">
        <div className="flex flex-wrap items-center gap-2">
          {canManage && tab === "spaces" ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New space
            </Button>
          ) : null}
          {canManage ? (
            <div className="inline-flex items-center rounded-lg bg-muted p-0.5">
              {(
                [
                  ["spaces", "Spaces", Layers],
                  ["members", "Members", Users],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                    tab === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setTab(key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </PageHeader>

      {tab === "spaces" ? (
        spacesQuery.isLoading ? (
          <LoadingRows count={4} />
        ) : spaces.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No spaces yet"
            description="Create a space so clients can join the community shell."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  New space
                </Button>
              ) : undefined
            }
          />
        ) : (
          <SectionCard noPadding>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Space
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((space) => (
                  <tr key={space.id} className="hover:bg-accent/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{space.name}</p>
                      {space.description ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {space.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {orgSlug ? (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={spaceAppHref(orgSlug, space.slug)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </a>
                          </Button>
                        ) : null}
                        {canManage && orgId != null ? (
                          <EditSpaceDialog
                            organizationId={orgId}
                            space={space}
                          />
                        ) : null}
                        {canManage ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={archiveMutation.isPending}
                            onClick={() => void handleArchive(space)}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )
      ) : canManage && orgId != null ? (
        <OrgAccessDirectoryPanel organizationId={orgId} />
      ) : null}

      <Dialog
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next)
          if (!next) resetCreateForm()
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="space-name">Name</Label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main community"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="space-desc">Description</Label>
              <Input
                id="space-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            {orgId != null ? (
              <SpaceOfferRulesFields
                organizationId={orgId}
                value={offerRules}
                onChange={setOfferRules}
                idPrefix="dash-create-offer"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => void handleCreate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
