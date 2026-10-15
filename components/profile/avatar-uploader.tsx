"use client"

import { useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useUploadAvatarMutation } from "@/hooks/use-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type AvatarUploaderProps = {
  name: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: "md" | "lg"
  className?: string
  onUploaded?: (url: string) => void
}

function initials(name: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

export function AvatarUploader({
  name,
  email,
  avatarUrl,
  size = "lg",
  className,
  onUploaded,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadAvatarMutation()
  const [preview, setPreview] = useState<string | null>(null)
  const displayUrl = preview ?? avatarUrl ?? null
  const dim = size === "lg" ? "h-20 w-20" : "h-12 w-12"
  const text = size === "lg" ? "text-2xl" : "text-sm"

  async function onFileChange(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file")
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    try {
      const url = await uploadMutation.mutateAsync(file)
      toast.success("Photo updated")
      onUploaded?.(url)
      setPreview(url)
    } catch (err) {
      setPreview(null)
      const message =
        err instanceof Error ? err.message : "Could not upload photo"
      toast.error(message)
    } finally {
      URL.revokeObjectURL(objectUrl)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn(dim, "border border-border")}>
        {displayUrl ? <AvatarImage src={displayUrl} alt="" /> : null}
        <AvatarFallback
          className={cn("bg-primary/10 font-bold text-primary", text)}
        >
          {initials(name, email)}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        disabled={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground disabled:opacity-60"
        aria-label="Change photo"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onFileChange(e.target.files?.[0])}
      />
    </div>
  )
}
