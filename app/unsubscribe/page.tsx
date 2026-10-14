"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { z } from "zod"
import { Button } from "@/components/ui/button"

const previewSchema = z.object({
  organizationName: z.string(),
  email: z.string(),
  alreadyOptedOut: z.boolean(),
})

type Preview = z.infer<typeof previewSchema>

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("t")?.trim() ?? ""
  const campaignId = searchParams.get("c")?.trim() ?? ""

  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoadError("This unsubscribe link is missing or incomplete.")
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(
          `/api/unsubscribe?t=${encodeURIComponent(token)}`
        )
        const body: unknown = await res.json().catch(() => null)
        if (!res.ok) {
          const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : "This unsubscribe link is invalid."
          if (!cancelled) setLoadError(message)
          return
        }
        const parsed = previewSchema.safeParse(body)
        if (!parsed.success) {
          if (!cancelled) setLoadError("This unsubscribe link is invalid.")
          return
        }
        if (!cancelled) {
          setPreview(parsed.data)
          if (parsed.data.alreadyOptedOut) setDone(true)
        }
      } catch {
        if (!cancelled) setLoadError("Could not load unsubscribe details.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleConfirm() {
    if (!token) return
    setConfirming(true)
    setConfirmError(null)
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...(campaignId ? { campaignId } : {}),
        }),
      })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Unsubscribe failed."
        setConfirmError(message)
        return
      }
      setDone(true)
    } catch {
      setConfirmError("Unsubscribe failed.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              C
            </span>
            <span className="font-display text-lg font-bold text-foreground">
              CoachStack
            </span>
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold">
            Unsubscribe
          </h1>
        </div>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : loadError ? (
          <p className="text-center text-sm text-destructive">{loadError}</p>
        ) : done && preview ? (
          <div className="space-y-2 text-center">
            <p className="text-sm text-foreground">
              {preview.email} is unsubscribed from marketing emails for{" "}
              {preview.organizationName}.
            </p>
            <p className="text-sm text-muted-foreground">
              You can close this page.
            </p>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Stop marketing emails from{" "}
              <span className="font-medium text-foreground">
                {preview.organizationName}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">{preview.email}</span>
              ?
            </p>
            {confirmError ? (
              <p className="text-center text-sm text-destructive">
                {confirmError}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={confirming}
              onClick={() => void handleConfirm()}
            >
              {confirming ? "Confirming…" : "Confirm unsubscribe"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  )
}
