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
import { externalHref } from "@/lib/coached"
import type { CreateCoachingSessionPayload } from "@/lib/services/coaching"

export function CreateCoachedSessionDialog({
  open,
  onOpenChange,
  organizationId,
  enrollmentProductId,
  coachingAssignmentId,
  clientUserId,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number
  enrollmentProductId: number
  coachingAssignmentId: number | null
  clientUserId: string | null
  onCreate: (payload: CreateCoachingSessionPayload) => Promise<void>
}) {
  const [scheduledAt, setScheduledAt] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [deliveryMode, setDeliveryMode] = useState("remote")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setScheduledAt("")
      setDurationMinutes(60)
      setDeliveryMode("remote")
      setMeetingUrl("")
      setLocation("")
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) {
      toast.error("Pick a date and time.")
      return
    }
    if (!clientUserId) {
      toast.error("Client has no account yet.")
      return
    }
    if (coachingAssignmentId == null) {
      toast.error("A coach must be assigned before creating a session.")
      return
    }
    setSubmitting(true)
    try {
      await onCreate({
        organization_id: organizationId,
        enrollment_product_id: enrollmentProductId,
        coaching_assignment_id: coachingAssignmentId,
        user_id: clientUserId,
        delivery_mode: deliveryMode,
        meeting_url: externalHref(meetingUrl.trim() || null),
        location: location.trim() || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: durationMinutes,
      })
      onOpenChange(false)
      toast.success("Session created")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create session"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New session</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at">Date and time</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              step={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery</Label>
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
          {deliveryMode !== "in_person" ? (
            <div className="space-y-1.5">
              <Label htmlFor="meeting_url">Meeting URL</Label>
              <Input
                id="meeting_url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          ) : null}
          {deliveryMode !== "remote" ? (
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
