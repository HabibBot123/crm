"use client"

import Link from "next/link"
import { ArrowRight, Calendar, User } from "lucide-react"
import type { CoachedProduct } from "@/hooks/use-coached"
import type { CoachedCoachPack } from "@/lib/services/coached"
import { Badge } from "@/components/ui/badge"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { StatusBadge } from "@/components/dashboard/status-badge"
import {
  deliveryStatus,
  formatProductDate,
  programHref,
} from "@/lib/coached"

export function ClientPackRow({ product }: { product: CoachedProduct }) {
  return (
    <RichListItem className="p-0">
      <Link
        href={programHref(product)}
        className="flex w-full min-w-0 items-center gap-4 p-4"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {product.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Calendar className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{product.product_title}</p>
          {product.offer_title ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.offer_title}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge
              status={deliveryStatus(
                product.enrollment_status,
                product.product_completed_at
              )}
              className="text-[10px] font-normal"
            />
            {product.completion_total != null && product.completion_total > 0 ? (
              <span className="text-xs font-medium text-primary">
                {product.completion_completed ?? 0}/{product.completion_total}{" "}
                sessions
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            {product.started_at ? (
              <span>Started {formatProductDate(product.started_at)}</span>
            ) : null}
            {product.expires_at ? (
              <span>Expires {formatProductDate(product.expires_at)}</span>
            ) : null}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
  )
}

export function CoachPackRow({ pack }: { pack: CoachedCoachPack }) {
  const thumbUrl = pack.client_avatar_url ?? pack.cover_image_url

  return (
    <RichListItem className="p-0">
      <Link
        href={`/coaching/${pack.enrollment_product_id}`}
        className="flex w-full min-w-0 items-center gap-4 p-4"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {pack.client_full_name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pack.product_title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-chart-4/20 bg-chart-4/10 text-[10px] font-normal normal-case text-chart-4"
            >
              As coach
            </Badge>
            <StatusBadge
              status={deliveryStatus(
                pack.enrollment_status,
                pack.product_completed_at
              )}
              className="text-[10px] font-normal"
            />
            {pack.completion_total != null && pack.completion_total > 0 ? (
              <span className="text-xs font-medium text-primary">
                {pack.completion_completed ?? 0}/{pack.completion_total}{" "}
                sessions
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            {pack.started_at ? (
              <span>Started {formatProductDate(pack.started_at)}</span>
            ) : null}
            {pack.expires_at ? (
              <span>Expires {formatProductDate(pack.expires_at)}</span>
            ) : null}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </RichListItem>
  )
}
