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
import type { CrmFormType } from "@/schemas/crm.schema"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function isCrmFormType(value: string): value is CrmFormType {
  return value === "default" || value === "webinar" || value === "freegiveaway"
}

export function CreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    title: string
    slug: string
    description: string | null
    form_type: CrmFormType
  }) => Promise<void>
  isPending?: boolean
}) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [formType, setFormType] = useState<CrmFormType>("default")
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(title))
    }
  }, [title, slugTouched])

  async function handleSubmit() {
    await onSubmit({
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      form_type: formType,
    })

    setTitle("")
    setSlug("")
    setDescription("")
    setFormType("default")
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
          <Select
            value={formType}
            onValueChange={(value) => {
              if (isCrmFormType(value)) setFormType(value)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Form type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="webinar">Webinar</SelectItem>
              <SelectItem value="freegiveaway">Free giveaway</SelectItem>
            </SelectContent>
          </Select>
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
