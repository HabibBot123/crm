"use client"

import { useCoachedAccessGuard } from "@/hooks/use-access-guard"

type Props = {
  children: React.ReactNode
}

export function CoachedAuthGate({ children }: Props) {
  const { canAccess, isLoading } = useCoachedAccessGuard()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your space…</p>
      </div>
    )
  }

  if (!canAccess) {
    // Redirect in progress
    return null
  }

  return <>{children}</>
}

