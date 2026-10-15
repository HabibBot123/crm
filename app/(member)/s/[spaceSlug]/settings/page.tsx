"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { Layers } from "lucide-react"
import { toast } from "sonner"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  useCommunitySpaceMembershipRules,
  useReplaceCommunitySpaceMembershipRulesMutation,
  useUpdateCommunitySpaceMutation,
} from "@/hooks/use-community"
import {
  SpaceOfferRulesFields,
  draftsFromOfferRules,
  offerRulesFromDrafts,
  type OfferRuleDraft,
} from "@/components/community/space-offer-rules-fields"
import { SpaceFeedsSettings } from "@/components/community/space-feeds-settings"
import { PageHeader } from "@/components/dashboard/page-header"
import { SectionCard } from "@/components/dashboard/section-card"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>
}) {
  const { spaceSlug } = use(params)
  const { orgSpaces, org, isLoading } = useCurrentCoachedOrg()
  const space = orgSpaces.find((s) => s.slug === spaceSlug) ?? null
  const organizationId = org?.organization_id ?? null
  const { can } = useOrgCapabilities({ organizationId })
  const canManage = can("community.manage")

  const updateMutation = useUpdateCommunitySpaceMutation(organizationId)
  const replaceRulesMutation =
    useReplaceCommunitySpaceMembershipRulesMutation(organizationId)
  const rulesQuery = useCommunitySpaceMembershipRules(
    canManage && space ? space.id : null
  )

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [offerRules, setOfferRules] = useState<Record<number, OfferRuleDraft>>(
    {}
  )
  const [rulesReady, setRulesReady] = useState(false)

  useEffect(() => {
    if (!space) return
    setName(space.name)
    setDescription(space.description ?? "")
  }, [space])

  useEffect(() => {
    if (!rulesQuery.isSuccess) return
    setOfferRules(draftsFromOfferRules(rulesQuery.data ?? []))
    setRulesReady(true)
  }, [rulesQuery.isSuccess, rulesQuery.data])

  if (isLoading) {
    return <LoadingRows count={4} />
  }

  if (!space || !org || organizationId == null) {
    return (
      <EmptyState
        icon={Layers}
        title="Space not found"
        action={
          <Button size="sm" variant="secondary" asChild>
            <Link href="/s">All spaces</Link>
          </Button>
        }
      />
    )
  }

  if (!canManage) {
    return (
      <EmptyState
        icon={Layers}
        title="No access"
        description="You don't have permission to manage this space."
        action={
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/s?space=${encodeURIComponent(space.slug)}`}>
              Back to space
            </Link>
          </Button>
        }
      />
    )
  }

  async function handleSaveSpace() {
    if (!space) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    try {
      await updateMutation.mutateAsync({
        space_id: space.id,
        name: trimmed,
        description: description.trim() || null,
      })
      await replaceRulesMutation.mutateAsync({
        space_id: space.id,
        offer_rules: offerRulesFromDrafts(offerRules),
        resync: true,
      })
      toast.success("Space updated")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update space"
      toast.error(message)
    }
  }

  const saving = updateMutation.isPending || replaceRulesMutation.isPending

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        back={`/s?space=${encodeURIComponent(space.slug)}`}
      />

      <SectionCard title="Space">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-space-name">Name</Label>
            <Input
              id="settings-space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main community"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-space-desc">Description</Label>
            <Input
              id="settings-space-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {!rulesReady || rulesQuery.isLoading ? (
            <LoadingRows count={3} />
          ) : (
            <SpaceOfferRulesFields
              organizationId={organizationId}
              value={offerRules}
              onChange={setOfferRules}
              idPrefix={`settings-space-${space.id}-offer`}
            />
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saving || !rulesReady}
              onClick={() => void handleSaveSpace()}
            >
              Save space
            </Button>
          </div>
        </div>
      </SectionCard>

      <SpaceFeedsSettings
        spaceId={space.id}
        organizationId={organizationId}
      />
    </div>
  )
}
