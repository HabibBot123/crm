"use client"

import { useAuth } from "@/hooks/use-auth"

export function GreetingBanner() {
  const { user } = useAuth()
  const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim()
  const firstName = fullName?.split(/\s+/)[0] ?? "there"

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 px-6 py-4">
      <p className="text-base font-semibold text-foreground">
        {greeting}, {firstName} 👋
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening in your organization.
      </p>
    </div>
  )
}
