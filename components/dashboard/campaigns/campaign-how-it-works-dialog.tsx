"use client"

import Link from "next/link"
import {
  BarChart3,
  Layers,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const STEPS: {
  icon: LucideIcon
  title: string
  body: string
}[] = [
  {
    icon: Users,
    title: "Audience",
    body: "Opted-in leads and clients land here. Sync pushes them to email delivery and refreshes segments.",
  },
  {
    icon: Layers,
    title: "Library",
    body: "Segments define who receives the email. Templates define the message.",
  },
  {
    icon: Megaphone,
    title: "Campaign",
    body: "Pick a segment and a template, then send now or schedule.",
  },
  {
    icon: BarChart3,
    title: "Delivery",
    body: "After send, track opens, clicks, and events per recipient.",
  },
]

type CampaignHowItWorksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignHowItWorksDialog({
  open,
  onOpenChange,
}: CampaignHowItWorksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-0">
          <DialogTitle>How campaigns work</DialogTitle>
          <DialogDescription>
            From audience to send in four steps.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 py-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      {step.title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            )
          })}
          <p className="pt-1 text-xs text-muted-foreground">
            Sending domain must be verified in{" "}
            <Link
              href="/dashboard/settings?section=email"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Settings: Email
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
