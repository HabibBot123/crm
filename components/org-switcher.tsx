"use client"

import Link from "next/link"
import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useCurrentOrganization } from "@/components/providers/organization-provider"

function orgInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

export function OrgSwitcher() {
  const [open, setOpen] = useState(false)
  const { organizations, currentOrganization, setCurrentOrganizationId, isLoading } = useCurrentOrganization()

  const displayOrg = currentOrganization ?? organizations[0] ?? null

  if (isLoading) {
    return (
      <div className="h-9 animate-pulse rounded-lg bg-muted/50 px-3" />
    )
  }

  if (organizations.length === 0) {
    return (
      <Link href="/create-organization">
        <Button variant="ghost" className="h-9 gap-2 px-3 text-sm font-medium">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-muted-foreground/50">
            <Plus className="h-3 w-3" />
          </span>
          <span className="hidden sm:inline-block">Create organization</span>
        </Button>
      </Link>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full min-w-0 justify-start gap-2 px-3 text-left text-sm font-medium"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            {displayOrg ? orgInitials(displayOrg.name) : "?"}
          </span>
          <span className="hidden min-w-0 truncate sm:inline-block" title={displayOrg?.name}>
            {displayOrg?.name ?? "Organization"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
          Organizations
        </div>
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => {
              setCurrentOrganizationId(org.id)
              setOpen(false)
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/50",
              displayOrg?.id === org.id && "bg-accent/50"
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {orgInitials(org.name)}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium text-foreground">{org.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {org.slug}.coachstack.co
              </div>
            </div>
            {displayOrg?.id === org.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </button>
        ))}
        <div className="mt-2 border-t border-border pt-2">
          <Link href="/create-organization">
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-border">
                <Plus className="h-3.5 w-3.5" />
              </span>
              Create organization
            </button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
