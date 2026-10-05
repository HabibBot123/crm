"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Copy, Plus } from "lucide-react"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useCreateCrmAmbassadorLink,
  useCrmAmbassadorLinks,
  useUpdateCrmAmbassadorLinkStatus,
} from "@/hooks/use-crm-ambassadors"
import { CreateAmbassadorLinkDialog } from "@/components/dashboard/crm/create-ambassador-link-dialog"
import type { FetchAmbassadorLinksScope } from "@/lib/services/crm-ambassadors"
import type { AmbassadorLinkStatus } from "@/schemas/crm.schema"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isAmbassadorLinkStatus(value: string): value is AmbassadorLinkStatus {
  return value === "active" || value === "paused" || value === "archived"
}

export default function CrmFormsShareLinksPage() {
  const { currentOrganization } = useCurrentOrganization()
  const { can, scope, ownedBusinessUnitIds } = useOrgCapabilities()
  const canManageOthersLinks = can("forms.links.manage_others")
  const canCreateOwnLink = can("forms.links.create_own") || canManageOthersLinks
  const [openCreate, setOpenCreate] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null)
  const [linksPage, setLinksPage] = useState(1)
  const linksPageSize = 10

  const organizationId = currentOrganization?.id ?? null
  const organizationSlug = currentOrganization?.slug ?? null
  const selfMemberId = currentOrganization?.member_id ?? null
  const linksScope = useMemo((): FetchAmbassadorLinksScope | null => {
    if (!organizationId) return null
    if (canManageOthersLinks) {
      if (scope === "bu") return { kind: "bu", businessUnitIds: ownedBusinessUnitIds }
      return { kind: "org" }
    }
    if (selfMemberId == null) return null
    return { kind: "member", memberId: selfMemberId }
  }, [organizationId, canManageOthersLinks, scope, ownedBusinessUnitIds, selfMemberId])

  const { data: links, isLoading, error } = useCrmAmbassadorLinks({
    organizationId,
    scope: linksScope,
  })

  const createLink = useCreateCrmAmbassadorLink(organizationId)
  const updateStatus = useUpdateCrmAmbassadorLinkStatus(organizationId)

  const absoluteBaseUrl = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (appUrl) return appUrl.replace(/\/$/, "")
    if (typeof window !== "undefined") return window.location.origin
    return ""
  }, [])

  const basePublicPath = useMemo(() => {
    if (!organizationSlug) return ""
    return `${absoluteBaseUrl}/org/${organizationSlug}/form`
  }, [absoluteBaseUrl, organizationSlug])

  const paginatedLinks = useMemo(() => {
    const start = (linksPage - 1) * linksPageSize
    return links.slice(start, start + linksPageSize)
  }, [links, linksPage])

  useEffect(() => {
    setLinksPage(1)
  }, [organizationId, linksScope?.kind, linksScope?.kind === "member" ? linksScope.memberId : null])

  async function handleCopyLink(link: { id: number; ref_code: string; form_slug: string }) {
    if (!basePublicPath.trim()) return
    const url = `${basePublicPath}/${link.form_slug}?ref=${encodeURIComponent(link.ref_code)}`
    await navigator.clipboard.writeText(url)
    setCopiedLinkId(link.id)
    toast.success("Link copied")
    window.setTimeout(() => setCopiedLinkId((prev) => (prev === link.id ? null : prev)), 1200)
  }

  if (!currentOrganization) {
    return (
      <p className="text-sm text-muted-foreground">Select an organization to manage share links.</p>
    )
  }

  const canOpenCreateDialog = canCreateOwnLink && (canManageOthersLinks || selfMemberId != null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" disabled={!canOpenCreateDialog} onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4" />
          Create link
        </Button>
      </div>

      {canCreateOwnLink && !canManageOthersLinks && selfMemberId == null ? (
        <p className="text-sm text-destructive">
          Your account is missing an organization membership id. You cannot create share links.
        </p>
      ) : null}

      <SectionCard
        noPadding
        footer={
          links.length > 0 ? (
            <div className="flex items-center justify-between">
              <PaginationSummary page={linksPage} pageSize={linksPageSize} total={links.length} />
              <PaginationControls
                page={linksPage}
                pageSize={linksPageSize}
                total={links.length}
                onPageChange={setLinksPage}
              />
            </div>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="p-4">
            <LoadingRows count={6} />
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        ) : links.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No links found" description="Create a tracked link to start." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-muted/60">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Label
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Form
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Business unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ref code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Leads
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Converted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Last lead
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-accent/60">
                    <td className="px-4 py-3 text-sm">{link.label}</td>
                    <td className="px-4 py-3 text-sm">{link.form_title}</td>
                    <td className="px-4 py-3 text-sm">{link.business_unit_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{link.ref_code}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={link.status}
                        onValueChange={(value) => {
                          if (!isAmbassadorLinkStatus(value)) return
                          updateStatus.mutate({ id: link.id, status: value })
                        }}
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{link.clicks_count}</td>
                    <td className="px-4 py-3 text-right text-sm">{link.leads_count}</td>
                    <td className="px-4 py-3 text-right text-sm">{link.converted_count}</td>
                    <td className="px-4 py-3 text-sm">
                      {link.last_lead_at ? formatDateTime(link.last_lead_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          handleCopyLink({
                            id: link.id,
                            ref_code: link.ref_code,
                            form_slug: link.form_slug,
                          })
                        }
                        disabled={!basePublicPath.trim()}
                      >
                        {copiedLinkId === link.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedLinkId === link.id ? "Copied" : "Copy link"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {canOpenCreateDialog ? (
        <CreateAmbassadorLinkDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          isPending={createLink.isPending}
          organizationId={currentOrganization.id}
          canSelectMember={canManageOthersLinks}
          selfMemberId={selfMemberId ?? undefined}
          basePublicPath={basePublicPath}
          onSubmit={async (payload) => {
            await createLink.mutateAsync(payload)
          }}
        />
      ) : null}
    </div>
  )
}
