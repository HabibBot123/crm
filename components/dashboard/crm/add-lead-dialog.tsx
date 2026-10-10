"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SearchSelect } from "@/components/ui/search-select"
import type { SalesMemberOption } from "@/lib/services/crm"

export function AddLeadDialog({
  open,
  onOpenChange,
  salesMembers,
  showOwnerAssignment = true,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  salesMembers: SalesMemberOption[]
  showOwnerAssignment?: boolean
  onSubmit: (input: {
    fullName: string
    email: string
    phone: string
    ownerId: number | null
  }) => Promise<void>
  isPending?: boolean
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [owner, setOwner] = useState<string>("none")

  async function handleSubmit() {
    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      ownerId:
        showOwnerAssignment && owner !== "none" ? Number(owner) : null,
    })
    setFullName("")
    setEmail("")
    setPhone("")
    setOwner("none")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>Create a lead manually in CRM.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {showOwnerAssignment ? (
            <SearchSelect
              value={owner}
              onValueChange={setOwner}
              placeholder="Assign owner (optional)"
              searchPlaceholder="Search team…"
              emptyText="No team member found."
              noneOption={{ value: "none", label: "Unassigned" }}
              options={salesMembers.map((member) => ({
                value: String(member.memberId),
                label: member.fullName ?? `Member #${member.memberId}`,
              }))}
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !fullName.trim() || !email.trim()}>
            Create lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
