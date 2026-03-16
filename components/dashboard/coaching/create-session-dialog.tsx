"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { CreateCoachingSessionPayload } from "@/lib/services/coaching"
import type { CoachingEnrollmentProduct } from "@/lib/services/coaching"

export type CreateSessionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number
  preselectedPack: CoachingEnrollmentProduct | null
  getAssignmentId: (enrollmentProductId: number) => Promise<number | null>
  onCreate: (payload: CreateCoachingSessionPayload) => Promise<void>
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  organizationId,
  preselectedPack,
  getAssignmentId,
  onCreate,
}: CreateSessionDialogProps) {
  const [assignmentId, setAssignmentId] = useState<number | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [deliveryMode, setDeliveryMode] = useState<string>("remote")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const enrollmentProductId = preselectedPack?.enrollment_product_id ?? null
  const userId = preselectedPack?.user_id ?? null

  useEffect(() => {
    if (!open) {
      setAssignmentId(null)
      setScheduledAt("")
      setDurationMinutes(60)
      setMeetingUrl("")
      setLocation("")
    }
  }, [open])

  useEffect(() => {
    if (!open || enrollmentProductId == null) {
      setAssignmentId(null)
      return
    }
    let cancelled = false
    setAssignmentLoading(true)
    getAssignmentId(enrollmentProductId)
      .then((id) => {
        if (!cancelled) setAssignmentId(id ?? null)
      })
      .finally(() => {
        if (!cancelled) setAssignmentLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, enrollmentProductId, getAssignmentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enrollmentProductId == null || !scheduledAt) {
      toast.error("Fill in the date.")
      return
    }
    if (!userId) {
      toast.error("This pack has no coached client yet. The coached has not created their account after purchase. A session can only be created once they have signed up.")
      return
    }
    if (assignmentId == null) {
      toast.error("No coach assigned to this pack. Assign a coach to the pack before creating a session.")
      return
    }
    setSubmitting(true)
    try {
      await onCreate({
        organization_id: organizationId,
        enrollment_product_id: enrollmentProductId,
        coaching_assignment_id: assignmentId,
        user_id: userId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: durationMinutes,
        delivery_mode: deliveryMode || null,
        meeting_url: meetingUrl || null,
        location: location || null,
        session_number: null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New session</DialogTitle>
          {preselectedPack && (
            <p className="text-sm text-muted-foreground">
              {preselectedPack.product_title} · {preselectedPack.user_full_name}
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {assignmentLoading && (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date and time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
              />
            </div>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={deliveryMode} onValueChange={setDeliveryMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Video link (optional)</Label>
            <Input
              type="url"
              placeholder="https://meet.google.com/…"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>Location (optional)</Label>
            <Input
              placeholder="Address or venue"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                assignmentLoading ||
                !scheduledAt ||
                assignmentId == null ||
                !userId
              }
            >
              {submitting ? "Creating…" : "Create session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
