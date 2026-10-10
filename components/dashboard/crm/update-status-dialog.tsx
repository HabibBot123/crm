"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { LeadStatus, OrganizationLeadStatus } from "@/schemas/crm.schema"

export function UpdateStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  statuses,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStatus: LeadStatus
  statuses: OrganizationLeadStatus[]
  onSubmit: (input: { toStatus: LeadStatus; note: string }) => Promise<void>
  isPending?: boolean
}) {
  const [toStatus, setToStatus] = useState<LeadStatus>(currentStatus)
  const [note, setNote] = useState("")

  useEffect(() => {
    if (open) setToStatus(currentStatus)
  }, [open, currentStatus])

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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <Select
              value={toStatus}
              onValueChange={(value) => {
                if (statuses.some((status) => status.key === value)) {
                  setToStatus(value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.key} value={status.key}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Note
            </p>
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
