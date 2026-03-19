"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { acceptTeamInvitation, fetchTeamInvitation, type TeamInvitationInfo } from "@/lib/services/team"

type Status = "idle" | "loading" | "ready" | "accepting" | "accepted" | "error"

export default function InviteTeamAcceptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, signOut } = useAuth()

  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<TeamInvitationInfo | null>(null)

  const token = searchParams.get("token") ?? ""

  useEffect(() => {
    if (!token || status !== "idle") return

    const load = async () => {
      setStatus("loading")
      setError(null)
      try {
        const info = await fetchTeamInvitation(token)
        setInvite(info)
        setStatus("ready")
      } catch (e) {
        const message =
          e && typeof (e as { message?: unknown }).message === "string"
            ? (e as { message: string }).message
            : "Unable to load this invitation. It may have expired or been used."
        setError(message)
        setStatus("error")
      }
    }

    void load()
  }, [token, status])

  const handleAccept = async () => {
    if (!token) return
    setStatus("accepting")
    setError(null)
    try {
      const body = await acceptTeamInvitation(token)
      setStatus("accepted")
      const orgId = body.organization_id
      if (orgId) {
        router.push(`/dashboard?orgId=${orgId}`)
      } else {
        router.push("/dashboard")
      }
    } catch (e) {
      const message =
        e && typeof (e as { message?: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Unable to accept invitation. Please try again."
      setError(message)
      setStatus("error")
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">This invitation link is invalid.</p>
      </div>
    )
  }

  const invitedEmail = invite?.email ?? null
  const orgName = invite?.organization_name ?? null

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {orgName ? `Join ${orgName}` : "Join your coach's workspace"}
        </h1>

        {status === "loading" && (
          <p className="mt-2 text-sm text-muted-foreground">We&apos;re checking your invitation…</p>
        )}

        {status === "error" && (
          <>
            <p className="mt-2 text-sm text-destructive">{error}</p>
          </>
        )}

        {status === "ready" && (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {invitedEmail && orgName
                ? `You were invited to join ${orgName} with the email ${invitedEmail}.`
                : invitedEmail
                  ? `You were invited to join this workspace with the email ${invitedEmail}.`
                  : orgName
                    ? `You were invited to join ${orgName}.`
                    : "You were invited to join this workspace."}
            </p>

            {!user && (
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={() =>
                    router.push(`/login?next=/invite/team?token=${encodeURIComponent(token)}`)
                  }
                >
                  Log in to continue
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/coached-signup?next=/invite/team?token=${encodeURIComponent(token)}`)
                  }
                >
                  Create an account
                </Button>
              </div>
            )}

            {user && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  You&apos;re currently logged in as {user.email}. Make sure this matches the email that received the
                  invitation.
                </p>
                <Button className="w-full" onClick={handleAccept} disabled={status !== "ready"}>
                  Accept invitation
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await signOut()
                    router.refresh()
                  }}
                >
                  Disconnect
                </Button>
              </div>
            )}
          </>
        )}

        {status === "accepted" && (
          <p className="mt-2 text-sm text-muted-foreground">You&apos;re being redirected to your dashboard…</p>
        )}

        {status === "error" && (
          <Button
            className="mt-4 w-full"
            onClick={() => {
              setStatus("idle")
              setError(null)
            }}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

