"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, UserMinus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useGetOrCreateCommunityDmMutation } from "@/hooks/use-community-dm"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type MemberCardProps = {
  userId: string
  fullName: string | null
  avatarUrl?: string | null
  role?: string | null
  subtitle?: string | null
  onRemove?: () => void
  removePending?: boolean
}

function initials(name: string | null) {
  if (!name?.trim()) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function MemberCard({
  userId,
  fullName,
  avatarUrl,
  role,
  subtitle,
  onRemove,
  removePending,
}: MemberCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { org } = useCurrentCoachedOrg()
  const openDm = useGetOrCreateCommunityDmMutation(
    org?.organization_id ?? null
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const name = fullName?.trim() || "Member"
  const isSelf = user?.id === userId

  async function handleMessage() {
    if (!org) {
      toast.error("Open an organization first")
      return
    }
    try {
      const conv = await openDm.mutateAsync(userId)
      router.push(`/messages?c=${conv.id}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not open conversation"
      toast.error(message)
    }
  }

  return (
    <>
      <article className="relative flex flex-col rounded-xl border border-border bg-card p-4">
        {onRemove ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={removePending}
            onClick={() => setConfirmOpen(true)}
            aria-label="Remove member"
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="flex flex-1 flex-col items-center text-center">
          <Avatar className="h-16 w-16 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-muted text-base font-semibold">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 line-clamp-1 text-sm font-semibold text-foreground">
            {name}
          </p>
          {subtitle?.trim() ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : role ? (
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {role}
            </p>
          ) : null}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isSelf || openDm.isPending}
            onClick={() => void handleMessage()}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </Button>
        </div>
      </article>

      {onRemove ? (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove {name} from this space? They can be added again later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={removePending}
                onClick={() => {
                  onRemove()
                  setConfirmOpen(false)
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}
