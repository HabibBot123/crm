"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useCoachedCommunityOrgs } from "@/hooks/use-community"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { deliveryStatus, formatProductDate, programHref } from "@/lib/coached"
import { resolveCoachedOrgSlug } from "@/lib/coached-last-org"

function CourseRow({ product }: { product: CoachedProduct }) {
  return (
    <RichListItem className="p-0">
      <Link
        href={programHref(product)}
        className="flex w-full min-w-0 items-center gap-4 p-4"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {product.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.cover_image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen className="h-6 w-6 text-primary" />
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
                completed
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

export default function CoursesPage() {
  const { ready, isOrgApp, isHub, goToOrg, goToHub } = useCoachedHost()
  const { coachedOrgs, isLoading } = useCoached()
  const communityOrgs = useCoachedCommunityOrgs()
  const { orgProducts, org, isLoading: orgLoading } = useCurrentCoachedOrg()

  const orgSlugsKey = useMemo(() => {
    const slugs = new Set<string>()
    for (const o of coachedOrgs) slugs.add(o.organization_slug)
    for (const o of communityOrgs.data ?? []) slugs.add(o.organization_slug)
    return Array.from(slugs).join(",")
  }, [coachedOrgs, communityOrgs.data])

  const listsReady = !isLoading && !communityOrgs.isLoading
  const hubTarget = useMemo(() => {
    if (!isHub || !listsReady) return null
    const slugs = orgSlugsKey ? orgSlugsKey.split(",") : []
    return resolveCoachedOrgSlug(slugs)
  }, [isHub, listsReady, orgSlugsKey])

  useEffect(() => {
    if (!ready || !isHub || !listsReady) return
    if (hubTarget) {
      goToOrg(hubTarget, "/courses")
      return
    }
    goToHub("/home?pick=1")
  }, [ready, isHub, listsReady, hubTarget, goToOrg, goToHub])

  if (!ready || isHub || isLoading || (isOrgApp && orgLoading)) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <LoadingRows count={5} />
      </div>
    )
  }

  const courses = orgProducts.filter((p) => p.product_type === "course")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Courses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {org
            ? `Active courses in ${org.organization_name}`
            : "Active courses in this organization"}
        </p>
      </div>

      {courses.length > 0 ? (
        <ul className="space-y-3">
          {courses.map((p) => (
            <CourseRow key={p.enrollment_product_id} product={p} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No active courses"
          description="Expired enrollments do not appear here."
        />
      )}
    </div>
  )
}
