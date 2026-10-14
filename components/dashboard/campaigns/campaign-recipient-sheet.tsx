"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { StatusBadge } from "@/components/dashboard/status-badge"
import {
  useCampaignRecipientEvents,
  useCampaignRecipientSentEmail,
} from "@/hooks/use-campaign-delivery"
import type { CampaignRecipientListItem } from "@/schemas/campaign-delivery.schema"
import { RECIPIENT_STATUS_CONFIGS } from "@/lib/campaigns/delivery-labels"
import { cn } from "@/lib/utils"

const EVENT_DOT_STYLES = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
  default: "bg-primary",
} as const

type CampaignRecipientSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: number | null
  campaignId: number
  recipient: CampaignRecipientListItem | null
}

function formatEventTime(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function CampaignRecipientSheet({
  open,
  onOpenChange,
  organizationId,
  campaignId,
  recipient,
}: CampaignRecipientSheetProps) {
  const { data: events, isLoading } = useCampaignRecipientEvents(
    open && recipient ? organizationId : null,
    open && recipient ? campaignId : null,
    recipient?.id ?? null
  )

  const {
    data: sentEmail,
    isLoading: sentLoading,
    isFetching: sentFetching,
  } = useCampaignRecipientSentEmail(
    organizationId,
    campaignId,
    recipient?.id ?? null,
    recipient?.provider_recipient_id,
    open && recipient != null
  )

  const title = recipient?.full_name?.trim() || recipient?.email || "Recipient"
  const showSentLoading =
    !!recipient?.provider_recipient_id?.trim() &&
    (sentLoading || sentFetching) &&
    sentEmail == null
  const hasSentHtml = !!sentEmail?.html?.trim()
  const hasSentText = !!sentEmail?.text?.trim()
  const showSentContent = hasSentHtml || hasSentText

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>Recipient</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="space-y-1 border-b border-border pb-4 pr-10">
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              {title}
            </h3>
            {recipient ? (
              <p className="text-sm text-muted-foreground">{recipient.email}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email events
            </p>
            {isLoading ? (
              <LoadingRows count={3} />
            ) : !events || events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events yet for this recipient.
              </p>
            ) : (
              <ol>
                {events.map((event, index) => {
                  const config =
                    RECIPIENT_STATUS_CONFIGS[event.event_type] ?? {
                      label: event.event_type,
                      variant: "muted" as const,
                    }
                  const isLast = index === events.length - 1
                  return (
                    <li key={event.id} className="relative flex gap-3">
                      <div className="flex w-3 shrink-0 flex-col items-center">
                        <span
                          className={cn(
                            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-background",
                            EVENT_DOT_STYLES[config.variant]
                          )}
                          aria-hidden
                        />
                        {!isLast ? (
                          <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "flex min-w-0 flex-1 items-center justify-between gap-3",
                          !isLast && "pb-4"
                        )}
                      >
                        <StatusBadge
                          status={event.event_type}
                          configs={RECIPIENT_STATUS_CONFIGS}
                        />
                        <time
                          dateTime={event.occurred_at}
                          className="shrink-0 text-xs tabular-nums text-muted-foreground"
                        >
                          {formatEventTime(event.occurred_at)}
                        </time>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {showSentLoading ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sent email
              </p>
              <LoadingRows count={4} />
            </div>
          ) : null}

          {sentEmail && showSentContent ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sent email
              </p>
              {sentEmail.subject?.trim() ? (
                <p className="text-sm font-medium text-foreground">
                  {sentEmail.subject}
                </p>
              ) : null}
              {hasSentHtml && sentEmail.html ? (
                <div
                  className={cn(
                    "rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed",
                    "[&_img]:max-w-full [&_p]:my-2",
                    "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
                    "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
                    "[&_li]:my-0.5 [&_li_p]:my-0"
                  )}
                  dangerouslySetInnerHTML={{ __html: sentEmail.html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
                  {sentEmail.text}
                </pre>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
