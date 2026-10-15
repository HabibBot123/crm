"use client"

import Link from "next/link"
import { ArrowRight, Layers } from "lucide-react"
import { RichListItem } from "@/components/dashboard/rich-list-item"
type SpaceCardProps = {
  name: string
  slug: string
  description?: string | null
  memberCount?: number | null
}

export function SpaceCard({
  name,
  slug,
  description,
  memberCount,
}: SpaceCardProps) {
  const subtitle =
    description?.trim() ||
    (memberCount != null
      ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
      : `@${slug}`)

  return (
    <RichListItem className="p-0">
      <Link
        href={`/s?space=${encodeURIComponent(slug)}`}
        className="flex w-full min-w-0 items-center gap-4 p-4 text-left"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{name}</p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
  )
}
