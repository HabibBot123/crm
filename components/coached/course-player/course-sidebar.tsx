"use client"

import { useEffect, useState } from "react"
import { Check, List } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import type { CoachedCourseModule, CoachedCourseModuleItem } from "@/lib/services/coached"

type CourseSidebarProps = {
  modules: CoachedCourseModule[]
  progress: Set<number>
  activeModuleId: number | null
  activeItemId: number | null
  onSelectLesson: (moduleId: number, itemId: number) => void
}

function SidebarContent({
  modules,
  progress,
  activeModuleId,
  activeItemId,
  onSelectLesson,
}: CourseSidebarProps) {
  const [openModules, setOpenModules] = useState<string[]>([])

  useEffect(() => {
    if (activeModuleId == null) return
    const id = String(activeModuleId)
    setOpenModules((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    )
  }, [activeModuleId])

  return (
    <Accordion
      type="multiple"
      value={openModules}
      onValueChange={(value) => {
        const next = Array.isArray(value)
          ? value
          : value
          ? [value]
          : []
        setOpenModules(next)
      }}
      className="w-full"
    >
      {modules.map((mod) => (
        <AccordionItem key={mod.id} value={String(mod.id)}>
          <AccordionTrigger className="py-3 text-left text-sm font-medium min-h-[44px]">
            {mod.title}
            <span className="text-muted-foreground font-normal ml-1">
              ({mod.product_module_items.filter((i) => progress.has(i.id)).length}/
              {mod.product_module_items.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-0.5 pb-2">
              {mod.product_module_items.map((item) => {
                const isActive =
                  activeModuleId === mod.id && activeItemId === item.id
                const isComplete = progress.has(item.id)
                const title =
                  item.title ||
                  item.content_items?.name ||
                  `Lesson ${item.position + 1}`
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLesson(mod.id, item.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors min-h-[44px]",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                          isComplete
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {isComplete ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span className="text-[10px] font-medium">
                            {item.position + 1}
                          </span>
                        )}
                      </span>
                      <span className="truncate">{title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function CourseSidebar(props: CourseSidebarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed z-40 h-12 w-12 min-h-[48px] min-w-[48px] rounded-full shadow-lg md:hidden touch-manipulation right-[max(1rem,env(safe-area-inset-right))] bottom-[max(5.5rem,calc(5.5rem+env(safe-area-inset-bottom)))]"
            aria-label="Open course contents"
          >
            <List className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-[85vh] max-h-[85dvh] overflow-hidden flex flex-col rounded-t-2xl pt-6 pb-[env(safe-area-inset-bottom)]"
          showCloseButton
        >
          <SheetHeader className="px-5 pb-4 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
            <SheetTitle className="text-left">Course contents</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
            <SidebarContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className="w-[280px] shrink-0 border-r border-border bg-card/50 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2">
          Contents
        </h2>
        <SidebarContent {...props} />
      </div>
    </aside>
  )
}
