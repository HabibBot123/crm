"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, Layers } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { CoachedCourseModule } from "@/lib/services/coached"

type CourseSidebarProps = {
  modules: CoachedCourseModule[]
  progress: Set<number>
  activeModuleId: number | null
  activeItemId: number | null
  onSelectLesson: (moduleId: number, itemId: number) => void
  /** Controlled mobile sheet (no FAB). */
  sheetOpen?: boolean
  onSheetOpenChange?: (open: boolean) => void
}

function lessonTitle(
  item: CoachedCourseModule["product_module_items"][number],
  index: number
): string {
  return item.title || item.content_items?.name || `Lesson ${index + 1}`
}

function SidebarContent({
  modules,
  progress,
  activeModuleId,
  activeItemId,
  onSelectLesson,
  onLessonPicked,
}: CourseSidebarProps & { onLessonPicked?: () => void }) {
  const [openModules, setOpenModules] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (activeModuleId == null) return
    setOpenModules((prev) => {
      if (prev.has(activeModuleId)) return prev
      const next = new Set(prev)
      next.add(activeModuleId)
      return next
    })
  }, [activeModuleId])

  function toggleModule(moduleId: number) {
    setOpenModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  return (
    <nav className="space-y-1" aria-label="Course contents">
      {modules.map((mod) => {
        const isOpen = openModules.has(mod.id)
        const done = mod.product_module_items.filter((i) =>
          progress.has(i.id)
        ).length
        const total = mod.product_module_items.length
        const moduleActive = activeModuleId === mod.id

        return (
          <div key={mod.id} className="space-y-0.5">
            <button
              type="button"
              title={mod.title}
              onClick={() => toggleModule(mod.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                moduleActive
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{mod.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {done}/{total}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  isOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>

            {isOpen ? (
              <ul className="space-y-0.5 pb-1 pl-3">
                {mod.product_module_items.map((item, index) => {
                  const isActive =
                    activeModuleId === mod.id && activeItemId === item.id
                  const isComplete = progress.has(item.id)
                  const title = lessonTitle(item, index)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        title={title}
                        onClick={() => {
                          onSelectLesson(mod.id, item.id)
                          onLessonPicked?.()
                        }}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                          isActive
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium",
                            isComplete
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          {isComplete ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="truncate">{title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

export function CourseSidebar({
  sheetOpen,
  onSheetOpenChange,
  ...contentProps
}: CourseSidebarProps) {
  const controlled =
    typeof sheetOpen === "boolean" && typeof onSheetOpenChange === "function"

  return (
    <>
      <aside className="hidden w-56 shrink-0 md:block">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contents
        </p>
        <SidebarContent {...contentProps} />
      </aside>

      {controlled ? (
        <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
          <SheetContent
            side="bottom"
            className="flex h-[85vh] max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl pt-6 pb-[env(safe-area-inset-bottom)]"
            showCloseButton
          >
            <SheetHeader className="px-5 pb-4">
              <SheetTitle className="text-left">Contents</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <SidebarContent
                {...contentProps}
                onLessonPicked={() => onSheetOpenChange(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}
