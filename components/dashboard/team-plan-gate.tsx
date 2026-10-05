"use client"

import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"

/**
 * Shown on Team-plan surfaces when org.mode = solo.
 * Upgrade CTA is a stub until billing / plan switch exists.
 */
export function TeamPlanGate({
  title = "Team plan feature",
  description = "This option is for when you work with a team (sales, ambassadors, coaches, commissions).",
}: {
  title?: string
  description?: string
}) {
  return (
    <EmptyState
      icon={Users}
      title={title}
      description={description}
      action={
        <Button
          type="button"
          onClick={() => {
            // TODO: wire Solo → Team upgrade (billing / settings) when ready
          }}
        >
          Upgrade to Team
        </Button>
      }
    />
  )
}
