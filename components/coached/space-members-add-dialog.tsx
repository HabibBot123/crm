"use client"

import { useState } from "react"
import { Search, UserPlus } from "lucide-react"
import { toast } from "sonner"
import {
  useAddCommunitySpaceMemberMutation,
  useFindAddableCommunitySpaceMemberByEmail,
} from "@/hooks/use-community"
import type { AddableCommunitySpaceMemberMatch } from "@/schemas/community.schema"
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

type SpaceMembersAddDialogProps = {
  spaceId: number
  organizationId: number
  triggerClassName?: string
}

export function SpaceMembersAddDialog({
  spaceId,
  organizationId,
  triggerClassName,
}: SpaceMembersAddDialogProps) {
  const [open, setOpen] = useState(false)
  const lookupMutation = useFindAddableCommunitySpaceMemberByEmail(
    organizationId,
    spaceId
  )
  const addMutation = useAddCommunitySpaceMemberMutation(spaceId)
  const [email, setEmail] = useState("")
  const [match, setMatch] = useState<AddableCommunitySpaceMemberMatch | null>(
    null
  )

  function reset() {
    setEmail("")
    setMatch(null)
  }

  async function handleLookup() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      toast.error("Enter a valid email")
      return
    }
    try {
      const result = await lookupMutation.mutateAsync(trimmed)
      setMatch(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lookup failed"
      toast.error(message)
      setMatch(null)
    }
  }

  async function handleAdd(userId: string) {
    try {
      await addMutation.mutateAsync(userId)
      toast.success("Member added")
      setOpen(false)
      reset()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add member"
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
        <UserPlus className="h-4 w-4" />
        Add member
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-member-email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="add-member-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setMatch(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleLookup()
                  }}
                  placeholder="name@example.com"
                  disabled={lookupMutation.isPending || addMutation.isPending}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={lookupMutation.isPending || !email.trim()}
                  onClick={() => void handleLookup()}
                >
                  <Search className="h-4 w-4" />
                  Look up
                </Button>
              </div>
            </div>

            {match?.status === "found" ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {match.display_name ?? match.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.email}
                    {match.kind === "team" ? " · team" : " · client"}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={addMutation.isPending}
                  onClick={() => void handleAdd(match.user_id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            ) : null}

            {match?.status === "already_member" ? (
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {match.display_name ?? match.email}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Already in this space.
                </p>
              </div>
            ) : null}

            {match?.status === "no_account" ? (
              <p className="text-sm text-muted-foreground">
                {match.display_name ?? match.email} has no account yet. They need
                to sign up first.
              </p>
            ) : null}

            {match?.status === "not_found" ? (
              <p className="text-sm text-muted-foreground">
                No team member or living client with that email.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
