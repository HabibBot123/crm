"use client"

import { useEffect, useState } from "react"
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
import type {
  CoachedCoachingSession,
  UpdateCoachedSessionInput,
} from "@/lib/services/coached"

function toDatetimeLocal(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EditCoachedSessionDialog({
  open,
  onOpenChange,
  session,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: CoachedCoachingSession | null
  onSave: (input: UpdateCoachedSessionInput) => Promise<void>
}) {
  const [scheduledAt, setScheduledAt] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [deliveryMode, setDeliveryMode] = useState("remote")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !session) return
    setScheduledAt(toDatetimeLocal(session.scheduled_at))
    setDurationMinutes(session.duration_minutes || 60)
    setDeliveryMode(session.delivery_mode || "remote")
    setMeetingUrl(session.meeting_url ?? "")
    setLocation(session.location ?? "")
  }, [open, session])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) {
      toast.error("Pick a date and time.")
      return
    }
    setSubmitting(true)
    try {
      await onSave({
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: durationMinutes,
        delivery_mode: deliveryMode,
        meeting_url: externalHref(meetingUrl.trim() || null),
        location: location.trim() || null,
      })
      onOpenChange(false)
      toast.success("Session updated")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update session"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit_scheduled_at">Date and time</Label>
            <Input
              id="edit_scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit_duration">Duration (minutes)</Label>
            <Input
              id="edit_duration"
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
              <Label htmlFor="edit_meeting_url">Meeting URL</Label>
              <Input
                id="edit_meeting_url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
          ) : null}
          {deliveryMode !== "remote" ? (
            <div className="space-y-1.5">
              <Label htmlFor="edit_location">Location</Label>
              <Input
                id="edit_location"
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
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
