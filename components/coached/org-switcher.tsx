"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react"
import { useCoachedHost } from "@/hooks/use-coached-host"
import { useCoachedCommunityOrgs } from "@/hooks/use-community"
import { useIsMobile } from "@/hooks/use-mobile"
import { OrgLogo } from "@/components/coached/org-logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type OrgOption = {
  organization_id: number
  organization_name: string
  organization_slug: string
  logo_url?: string | null
  primary_color?: string | null
}

type OrgSwitcherProps = {
  /** Icon-only trigger (collapsed sidebar). */
  collapsed?: boolean
  className?: string
}

function TriggerButton({
  current,
  orgSlug,
  canSwitch,
  collapsed,
  className,
}: {
  current: OrgOption | null
  orgSlug: string | null
  canSwitch: boolean
  collapsed?: boolean
  className?: string
}) {
  const name =
    current?.organization_name ??
    (orgSlug ? orgSlug : "Choose organization")

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9 shrink-0", className)}
        aria-label={name}
      >
        <OrgLogo
          name={name}
          logoUrl={current?.logo_url}
          primaryColor={current?.primary_color}
          size="sm"
        />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-9 w-full max-w-full justify-start gap-2 px-2 font-normal",
        className
      )}
    >
      <OrgLogo
        name={name}
        logoUrl={current?.logo_url}
        primaryColor={current?.primary_color}
        size="sm"
      />
      <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
        {name}
      </span>
      {canSwitch ? (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      ) : null}
    </Button>
  )
}

function OrgList({
  orgs,
  orgSlug,
  onSelect,
  onHub,
}: {
  orgs: OrgOption[]
  orgSlug: string | null
  onSelect: (slug: string) => void
  onHub: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {orgs.length === 0 ? (
        <p className="px-2 py-3 text-sm text-muted-foreground">
          No organizations yet
        </p>
      ) : (
        orgs.map((org) => {
          const active = org.organization_slug === orgSlug
          return (
            <button
              key={org.organization_id}
              type="button"
              onClick={() => {
                if (active) return
                onSelect(org.organization_slug)
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60"
              )}
            >
              <OrgLogo
                name={org.organization_name}
                logoUrl={org.logo_url}
                primaryColor={org.primary_color}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {org.organization_name}
              </span>
              {active ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </button>
          )
        })
      )}
      <div className="my-1 border-t border-border" />
      <button
        type="button"
        onClick={onHub}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
          <LayoutGrid className="h-3.5 w-3.5" />
        </span>
        <span className="font-medium">All organizations</span>
      </button>
    </div>
  )
}

export function OrgSwitcher({ collapsed, className }: OrgSwitcherProps) {
  const { orgSlug, goToOrg, goToHub, ready } = useCoachedHost()
  const communityOrgs = useCoachedCommunityOrgs()
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)

  const orgs: OrgOption[] = useMemo(() => {
    return (communityOrgs.data ?? []).map((o) => ({
      organization_id: o.organization_id,
      organization_name: o.organization_name,
      organization_slug: o.organization_slug,
      logo_url: o.logo_url,
      primary_color: o.primary_color,
    }))
  }, [communityOrgs.data])

  const current =
    orgs.find((o) => o.organization_slug === orgSlug) ?? null
  const canSwitch = orgs.length > 1

  if (!ready) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl bg-muted",
          collapsed ? "h-9 w-9" : "h-9 w-full max-w-[14rem]",
          className
        )}
      />
    )
  }

  // Single org: brand link, no menu
  if (!canSwitch && current) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-9 justify-start gap-2 px-2 font-normal",
          collapsed ? "w-9 px-0" : "w-full max-w-full",
          className
        )}
        asChild
      >
        <Link href="/home">
          <OrgLogo
            name={current.organization_name}
            logoUrl={current.logo_url}
            primaryColor={current.primary_color}
            size="sm"
          />
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {current.organization_name}
            </span>
          ) : null}
        </Link>
      </Button>
    )
  }

  const trigger = (
    <TriggerButton
      current={current}
      orgSlug={orgSlug}
      canSwitch={canSwitch || orgs.length === 0}
      collapsed={collapsed}
      className={className}
    />
  )

  function selectOrg(slug: string) {
    setSheetOpen(false)
    goToOrg(slug, "/home")
  }

  function selectHub() {
    setSheetOpen(false)
    goToHub("/home?pick=1")
  }

  if (isMobile) {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4">
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-sm font-semibold">
              Organizations
            </SheetTitle>
          </SheetHeader>
          <OrgList
            orgs={orgs}
            orgSlug={orgSlug}
            onSelect={selectOrg}
            onHub={selectHub}
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 p-2"
        sideOffset={6}
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mb-1" />
        {orgs.length === 0 ? (
          <DropdownMenuItem disabled>No organizations yet</DropdownMenuItem>
        ) : (
          orgs.map((org) => {
            const active = org.organization_slug === orgSlug
            return (
              <DropdownMenuItem
                key={org.organization_id}
                className="gap-2.5"
                onClick={() => {
                  if (active) return
                  goToOrg(org.organization_slug, "/home")
                }}
              >
                <OrgLogo
                  name={org.organization_name}
                  logoUrl={org.logo_url}
                  primaryColor={org.primary_color}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate">
                  {org.organization_name}
                </span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </DropdownMenuItem>
            )
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2.5"
          onClick={() => goToHub("/home?pick=1")}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
            <LayoutGrid className="h-3.5 w-3.5" />
          </span>
          All organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
