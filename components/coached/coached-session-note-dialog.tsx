"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StoreBioEditor } from "@/components/storefront/store-bio-editor"
import { OfferRichDescription } from "@/components/storefront/offer-rich-description"
import { toast } from "sonner"
import { toRichTextHtml } from "@/lib/branding/sanitize-bio-html"
import type {
  CoachedCoachingSession,
  UpdateCoachedSessionInput,
} from "@/lib/services/coached"

export function CoachedSessionNoteDialog({
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
  const [notes, setNotes] = useState("")
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const completed = session?.completed_at != null

  useEffect(() => {
    if (!open || !session) return
    setNotes(session.notes ?? "")
    setEditing(!(session.notes?.trim()))
  }, [open, session])

  async function saveNotes(markComplete: boolean) {
    setSubmitting(true)
    try {
      const html = toRichTextHtml(notes)
      const input: UpdateCoachedSessionInput = {
        notes: html,
      }
      if (markComplete && !completed) {
        input.completed_at = new Date().toISOString()
      }
      await onSave(input)
      onOpenChange(false)
      toast.success(markComplete && !completed ? "Session completed" : "Note saved")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save note"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,40rem)] flex-col gap-4 overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>Session note</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {editing ? (
            <StoreBioEditor
              value={notes}
              onChange={setNotes}
              maxChars={5000}
              contentClassName="min-h-[160px] max-h-[min(40dvh,20rem)]"
            />
          ) : (
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              {notes.trim() ? (
                <OfferRichDescription
                  description={notes}
                  className="text-foreground"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No note yet.</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setEditing(true)}
              >
                Edit note
              </Button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void saveNotes(false)}
              >
                {submitting ? "Saving…" : "Save note"}
              </Button>
              {!completed ? (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={() => void saveNotes(true)}
                >
                  Save and complete
                </Button>
              ) : null}
            </>
          ) : !completed ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void saveNotes(true)}
            >
              Mark completed
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
