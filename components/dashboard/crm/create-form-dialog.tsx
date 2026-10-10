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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LeadStatus, OrganizationLeadStatus } from "@/schemas/crm.schema"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function CreateFormDialog({
  open,
  onOpenChange,
  leadStatuses,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadStatuses: OrganizationLeadStatus[]
  onSubmit: (input: {
    title: string
    slug: string
    description: string | null
    initial_status: LeadStatus
  }) => Promise<void>
  isPending?: boolean
}) {
  const defaultStatus = leadStatuses.find((status) => status.key === "new")?.key ?? "new"
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [initialStatus, setInitialStatus] = useState<LeadStatus>(defaultStatus)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title))
    }
  }, [title, slugTouched])

  useEffect(() => {
    if (open) {
      setInitialStatus(leadStatuses.find((status) => status.key === "new")?.key ?? "new")
    }
  }, [open, leadStatuses])

  async function handleSubmit() {
    await onSubmit({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      initial_status: initialStatus,
    })

    setTitle("")
    setSlug("")
    setDescription("")
    setInitialStatus(defaultStatus)
    setSlugTouched(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create form</DialogTitle>
          <DialogDescription>Create a new public lead form for your CRM pipeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Form title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            placeholder="form-slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true)
              setSlug(slugify(event.target.value))
            }}
          />
          <Input
            placeholder="Short description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Arrival status
            </p>
            <Select
              value={initialStatus}
              onValueChange={(value) => {
                if (leadStatuses.some((status) => status.key === value)) {
                  setInitialStatus(value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status when lead is created" />
              </SelectTrigger>
              <SelectContent>
                {leadStatuses.map((status) => (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim() || !slug.trim()}>
            Create form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
