"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, User, Calendar, Video, MapPin, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { fetchCoachedCoachingDetail } from "@/lib/services/coached"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatSessionDateTime, formatDuration } from "@/lib/coached"
import type { CoachedCoachingSession } from "@/lib/services/coached"
import { cn } from "@/lib/utils"

/** Local map: session delivery → theme tokens (outline pill pattern). */
const COACHED_DELIVERY_BADGE: Record<string, string> = {
  remote: "border-chart-3/20 bg-chart-3/10 text-chart-3",
  in_person: "border-chart-4/20 bg-chart-4/10 text-chart-4",
  hybrid: "border-chart-5/20 bg-chart-5/10 text-chart-5",
}

function coachedDeliveryBadgeClass(mode: string): string {
  const key = mode.toLowerCase()
  return COACHED_DELIVERY_BADGE[key] ?? "border-border bg-muted text-muted-foreground"
}

export default function CoachedCoachingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = use(params)
  const enrollmentProductId = Number(id)
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null

  const { data: detail = null, isLoading } = useQuery({
    queryKey: ["coached-coaching", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || !enrollmentProductId) {
        throw new Error("Cannot fetch coaching detail without user id and enrollment product id")
      }
      return fetchCoachedCoachingDetail(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && !!enrollmentProductId,
  })

  const slugMatches = slug != null && detail != null && detail.organization_slug === slug

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!detail || !slugMatches) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <p className="text-muted-foreground">
          Program not found or you don&apos;t have access
        </p>
        <Link href="/coached">
          <Button variant="outline" className="mt-4">
            Back to home
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/coached">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            {detail.product_title}
          </h1>
          <p className="text-sm text-muted-foreground">Coaching program</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          Your coach
        </h2>
        {detail.coach_full_name ? (
          <p className="mt-2 text-sm font-medium text-foreground">{detail.coach_full_name}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No coach assigned yet. Your coach will appear here once assigned.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Past sessions
        </h2>
        {detail.sessions_past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past sessions yet.</p>
        ) : (
          <ul className="space-y-2">
            {detail.sessions_past.map((s) => (
              <li key={s.id}>
                <SessionRow session={s} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Upcoming sessions
        </h2>
        {detail.sessions_upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming sessions scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {detail.sessions_upcoming.map((s) => (
              <li key={s.id}>
                <SessionRow session={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SessionRow({ session }: { session: CoachedCoachingSession }) {
  const completed = session.completed_at != null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {formatSessionDateTime(session.scheduled_at)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDuration(session.duration_minutes)}
        </span>
        {session.delivery_mode && (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-normal capitalize",
              coachedDeliveryBadgeClass(session.delivery_mode)
            )}
          >
            {session.delivery_mode.replace("_", " ")}
          </Badge>
        )}
        {completed && (
          <Badge
            variant="outline"
            className="border-success/20 bg-success/10 text-[10px] font-normal text-success normal-case"
          >
            <Check className="mr-0.5 h-3 w-3" />
            Completed
          </Badge>
        )}
      </div>
      {session.meeting_url && (
        <a
          href={session.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Video className="h-3 w-3" />
          Video link
        </a>
      )}
      {session.location && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {session.location}
        </p>
      )}
    </div>
  )
}
