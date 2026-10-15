"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { DashboardNavContent } from "@/components/dashboard/dashboard-nav-content"

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <div
        className={cn(
          "hidden flex-shrink-0 lg:block lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar lg:flex lg:transition-all lg:duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2 px-1">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                C
              </span>
              <span className="font-display text-sm font-semibold text-sidebar-foreground">
                CoachStack
              </span>
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <DashboardNavContent collapsed={collapsed} />
      </aside>
    </>
  )
}
