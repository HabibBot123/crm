"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
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
import type { CommunitySpace } from "@/schemas/community.schema"
import { LoadingRows } from "@/components/dashboard/loading-rows"
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

type EditSpaceDialogProps = {
  organizationId: number
  space: Pick<CommunitySpace, "id" | "name" | "description">
}

export function EditSpaceDialog({
  organizationId,
  space,
}: EditSpaceDialogProps) {
  const [open, setOpen] = useState(false)
  const updateMutation = useUpdateCommunitySpaceMutation(organizationId)
  const replaceRulesMutation =
    useReplaceCommunitySpaceMembershipRulesMutation(organizationId)
  const rulesQuery = useCommunitySpaceMembershipRules(open ? space.id : null)

  const [name, setName] = useState(space.name)
  const [description, setDescription] = useState(space.description ?? "")
  const [offerRules, setOfferRules] = useState<Record<number, OfferRuleDraft>>(
    {}
  )
  const [rulesReady, setRulesReady] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(space.name)
    setDescription(space.description ?? "")
    setRulesReady(false)
  }, [open, space.name, space.description])

  useEffect(() => {
    if (!open || !rulesQuery.isSuccess) return
    setOfferRules(draftsFromOfferRules(rulesQuery.data ?? []))
    setRulesReady(true)
  }, [open, rulesQuery.isSuccess, rulesQuery.data])

  async function handleSave() {
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
      setOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update space"
      toast.error(message)
    }
  }

  const saving = updateMutation.isPending || replaceRulesMutation.isPending

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-space-name">Name</Label>
              <Input
                id="edit-space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main community"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-space-desc">Description</Label>
              <Input
                id="edit-space-desc"
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
                idPrefix={`edit-space-${space.id}-offer`}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saving || !rulesReady}
              onClick={() => void handleSave()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
