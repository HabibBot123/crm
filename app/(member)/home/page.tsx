"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, BookOpen, Layers, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useCoached, type CoachedProduct } from "@/hooks/use-coached"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useCurrentCoachedOrg } from "@/hooks/use-current-coached-org"
import { useOrgCoachingInbox } from "@/hooks/use-org-coaching-inbox"
import { useCoachedCommunityOrgs } from "@/hooks/use-community"
import { useOrgCapabilities } from "@/hooks/use-org-capabilities"
import {
  ClientPackRow,
  CoachPackRow,
} from "@/components/coached/coaching-pack-rows"
import {
  formatProductDate,
  productTypeBadgeClassName,
  productTypeLabel,
  programHref,
} from "@/lib/coached"
import { resolveCoachedOrgSlug } from "@/lib/coached-last-org"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OrgLogo } from "@/components/coached/org-logo"
import { CreateSpaceDialog } from "@/components/coached/create-space-dialog"
import { SpaceCard } from "@/components/coached/space-card"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { cn } from "@/lib/utils"
import { displayNameFromUser } from "@/lib/user-display"

function ProductRowContent({ p }: { p: CoachedProduct }) {
  const isCoaching = p.product_type === "coaching"
  return (
    <>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {p.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <BookOpen className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 text-sm font-semibold text-foreground">
            {p.product_title}
          </p>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-normal normal-case",
              productTypeBadgeClassName(p.product_type)
            )}
          >
            {productTypeLabel(p.product_type)}
          </Badge>
        </div>
        {p.completion_total != null && p.completion_total > 0 ? (
          <p className="mt-1 text-xs font-medium text-primary">
            {p.completion_completed ?? 0}/{p.completion_total}{" "}
            {isCoaching ? "sessions" : "completed"}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          {p.started_at ? (
            <span>Started {formatProductDate(p.started_at)}</span>
          ) : null}
          {p.expires_at ? (
            <span>Expires {formatProductDate(p.expires_at)}</span>
          ) : null}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </>
  )
}

function HubHome() {
  const { user } = useAuth()
  const { coachedOrgs, isLoading } = useCoached()
  const communityOrgs = useCoachedCommunityOrgs()
  const { goToOrg, ready } = useCoachedHost()
  const searchParams = useSearchParams()
  const forcePick = searchParams.get("pick") === "1"

  const orgs = useMemo(() => {
    const bySlug = new Map<
      string,
      {
        organization_id: number
        organization_name: string
        organization_slug: string
        logo_url?: string | null
        primary_color?: string | null
      }
    >()
    for (const o of coachedOrgs) bySlug.set(o.organization_slug, o)
    for (const o of communityOrgs.data ?? []) {
      bySlug.set(o.organization_slug, {
        organization_id: o.organization_id,
        organization_name: o.organization_name,
        organization_slug: o.organization_slug,
        logo_url: o.logo_url,
        primary_color: o.primary_color,
      })
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      a.organization_name.localeCompare(b.organization_name)
    )
  }, [coachedOrgs, communityOrgs.data])

  const orgSlugsKey = orgs.map((o) => o.organization_slug).join(",")
  const displayName = displayNameFromUser(user) ?? user?.email ?? "there"
  const listsReady = !isLoading && !communityOrgs.isLoading

  const autoSlug = useMemo(() => {
    if (!listsReady || forcePick) return null
    const slugs = orgSlugsKey ? orgSlugsKey.split(",") : []
    return resolveCoachedOrgSlug(slugs)
  }, [listsReady, forcePick, orgSlugsKey])

  useEffect(() => {
    if (!ready || !autoSlug) return
    goToOrg(autoSlug, "/home")
  }, [ready, autoSlug, goToOrg])

  if (!listsReady || autoSlug) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-balance">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an organization to open its community and programs.
        </p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No organizations yet"
          description="Buy an offer from a coach store page, or wait to be added to a community."
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link href="/">Back to CoachStack</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orgs.map((org) => (
            <RichListItem key={org.organization_id} className="p-0">
              <button
                type="button"
                onClick={() => goToOrg(org.organization_slug, "/home")}
                className="flex w-full min-w-0 items-center gap-4 p-4 text-left"
              >
                <OrgLogo
                  name={org.organization_name}
                  logoUrl={org.logo_url}
                  primaryColor={org.primary_color}
                  size="lg"
                  className="border-2 border-primary/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {org.organization_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    @{org.organization_slug}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </RichListItem>
          ))}
        </ul>
      )}
    </div>
  )
}

function OrgHome() {
  const { org, orgProducts, orgSpaces, isLoading, orgSlug } =
    useCurrentCoachedOrg()
  const coachingInbox = useOrgCoachingInbox(org?.organization_id ?? null)
  const { can } = useOrgCapabilities({
    organizationId: org?.organization_id ?? null,
  })
  const canManage = can("community.manage")

  if (isLoading || coachingInbox.isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  if (!org || !orgSlug) {
    return (
      <EmptyState
        icon={Layers}
        title="Organization not found"
        description="You may not have access to this organization."
      />
    )
  }

  const continueProduct = orgProducts[0] ?? null
  const coachingClientPreview = coachingInbox.asClient.slice(0, 5)
  const coachingCoachPreview = coachingInbox.asCoach.slice(
    0,
    Math.max(0, 5 - coachingClientPreview.length)
  )

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {org.organization_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Community and programs for this organization
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Spaces</h2>
          {canManage ? (
            <CreateSpaceDialog organizationId={org.organization_id} />
          ) : null}
        </div>
        {orgSpaces.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No community space yet"
            description={
              canManage
                ? "Create a space to open the community for your members."
                : "You can still open your programs below. The coach can create a space anytime."
            }
          />
        ) : (
          <ul className="space-y-3">
            {orgSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                name={space.name}
                slug={space.slug}
                description={space.description}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Courses</h2>
          <Link
            href="/courses"
            className="text-xs font-medium text-primary hover:underline"
          >
            All courses
          </Link>
        </div>
        {orgProducts.filter((p) => p.product_type === "course").length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No active courses"
            description="Expired enrollments stay out of this list."
          />
        ) : (
          <ul className="space-y-3">
            {(continueProduct?.product_type === "course"
              ? [continueProduct]
              : [])
              .concat(
                orgProducts
                  .filter(
                    (p) =>
                      p.product_type === "course" &&
                      p.enrollment_product_id !==
                        continueProduct?.enrollment_product_id
                  )
                  .slice(0, 5)
              )
              .map((p) => (
                <RichListItem key={p.enrollment_product_id} className="p-0">
                  <Link
                    href={programHref(p)}
                    className="flex w-full min-w-0 items-center gap-4 p-4"
                  >
                    <ProductRowContent p={p} />
                  </Link>
                </RichListItem>
              ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Coaching</h2>
          <Link
            href="/coaching"
            className="text-xs font-medium text-primary hover:underline"
          >
            All coaching
          </Link>
        </div>
        {coachingInbox.isEmpty ? (
          <EmptyState
            icon={BookOpen}
            title="No active coaching"
            description="Your packs and assigned clients appear under Coaching."
          />
        ) : (
          <ul className="space-y-3">
            {coachingClientPreview.map((p) => (
              <ClientPackRow
                key={`client-${p.enrollment_product_id}`}
                product={p}
              />
            ))}
            {coachingCoachPreview.map((p) => (
              <CoachPackRow
                key={`coach-${p.enrollment_product_id}`}
                pack={p}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function CoachedHomePage() {
  const { ready, isOrgApp, isHub } = useCoachedHost()

  if (!ready) {
    return (
      <div className="space-y-8">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <LoadingRows count={4} />
      </div>
    )
  }

  if (isOrgApp) return <OrgHome />
  if (isHub) return <HubHome />

  // Fallback (e.g. unexpected host): hub-style picker
  return <HubHome />
}
