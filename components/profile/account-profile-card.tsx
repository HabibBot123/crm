"use client"

import { useEffect, useState } from "react"
import { Check, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { useUpdateMyProfileMutation } from "@/hooks/use-profile"
import { AvatarUploader } from "@/components/profile/avatar-uploader"
import { SectionCard } from "@/components/dashboard/section-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type AccountProfileCardProps = {
  displayName: string
  email: string | null
  avatarUrl: string | null
  memberSince?: string | null
}

export function AccountProfileCard({
  displayName,
  email,
  avatarUrl,
  memberSince,
}: AccountProfileCardProps) {
  const updateProfile = useUpdateMyProfileMutation()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)

  useEffect(() => {
    if (!editingName) setNameDraft(displayName)
  }, [displayName, editingName])

  async function handleSaveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.error("Name is required")
      return
    }
    try {
      await updateProfile.mutateAsync({ full_name: trimmed })
      setEditingName(false)
      toast.success("Name updated")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update name"
      toast.error(message)
    }
  }

  return (
    <SectionCard title="Account">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <AvatarUploader
          name={displayName || null}
          email={email}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full name
            </p>
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="max-w-xs"
                  autoFocus
                  maxLength={120}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSaveName()
                    if (e.key === "Escape") setEditingName(false)
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={updateProfile.isPending}
                  onClick={() => void handleSaveName()}
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={updateProfile.isPending}
                  onClick={() => setEditingName(false)}
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  {displayName || "Not set"}
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => {
                    setNameDraft(displayName)
                    setEditingName(true)
                  }}
                  aria-label="Edit name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </p>
            <p className="text-sm text-foreground">{email || "Not set"}</p>
          </div>
          {memberSince ? (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Member since
              </p>
              <p className="text-sm text-foreground">{memberSince}</p>
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  )
}
