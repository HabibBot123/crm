"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useCreateCommunitySpaceMutation } from "@/hooks/use-community"
import {
  SpaceOfferRulesFields,
  offerRulesFromDrafts,
  type OfferRuleDraft,
} from "@/components/community/space-offer-rules-fields"
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

type CreateSpaceDialogProps = {
  organizationId: number
  triggerClassName?: string
  /** Compact trigger for empty states / section headers */
  triggerLabel?: string
}

export function CreateSpaceDialog({
  organizationId,
  triggerClassName,
  triggerLabel = "New space",
}: CreateSpaceDialogProps) {
  const createMutation = useCreateCommunitySpaceMutation(organizationId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [offerRules, setOfferRules] = useState<Record<number, OfferRuleDraft>>(
    {}
  )

  function resetForm() {
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
      setOpen(false)
      resetForm()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create space"
      toast.error(message)
    }
  }

  return (
    <>
      <Button
        size="sm"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) resetForm()
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New space</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="member-space-name">Name</Label>
              <Input
                id="member-space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main community"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-space-desc">Description</Label>
              <Input
                id="member-space-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <SpaceOfferRulesFields
              organizationId={organizationId}
              value={offerRules}
              onChange={setOfferRules}
              idPrefix="create-space-offer"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
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
    </>
  )
}
