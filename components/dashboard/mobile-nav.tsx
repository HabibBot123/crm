"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardNavContent } from "@/components/dashboard/dashboard-nav-content"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          C
        </span>
        <span className="truncate font-display text-sm font-semibold text-foreground">
          CoachStack
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="flex w-60 gap-0 border-sidebar-border bg-sidebar p-0 sm:max-w-[15rem]"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-1"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                  C
                </span>
                <span className="font-display text-sm font-semibold text-sidebar-foreground">
                  CoachStack
                </span>
              </Link>
            </div>
            <DashboardNavContent
              onNavigate={() => setOpen(false)}
              showThemeToggle={false}
            />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
