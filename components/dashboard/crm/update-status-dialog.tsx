"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { LeadStatus } from "@/schemas/crm.schema"

const options: LeadStatus[] = [
  "new",
  "booked",
  "deadline",
  "converted",
  "failed",
  "contact_later",
]

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  booked: "Booked",
  deadline: "Deadline",
  converted: "Converted",
  failed: "Failed",
  contact_later: "Contact later",
}

function isLeadStatus(value: string): value is LeadStatus {
  return (
    value === "new" ||
    value === "booked" ||
    value === "deadline" ||
    value === "converted" ||
    value === "failed" ||
    value === "contact_later"
  )
}

export function UpdateStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStatus: LeadStatus
  onSubmit: (input: { toStatus: LeadStatus; note: string }) => Promise<void>
  isPending?: boolean
}) {
  const [toStatus, setToStatus] = useState<LeadStatus>(currentStatus)
  const [note, setNote] = useState("")

  async function handleSubmit() {
    await onSubmit({ toStatus, note })
    setNote("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update status</DialogTitle>
          <DialogDescription>Change lead status and optionally add context.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <Select
              value={toStatus}
              onValueChange={(value) => {
                if (isLeadStatus(value)) setToStatus(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {statusLabels[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</p>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional context"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
