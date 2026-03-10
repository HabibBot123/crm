"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import { useAuth } from "@/hooks/use-auth"
import { fetchContentItemsForPicker } from "@/lib/services/content"
import type { ContentItem } from "@/lib/services/content"
import { ContentTypeIcon, formatDuration } from "./content-type-icon"

export type ProductContentPickerProps = {
  open: boolean
  onClose: () => void
  onSelect: (contentItemId: number, title: string) => void
  addPending?: boolean
}

export function ProductContentPicker({
  open,
  onClose,
  onSelect,
  addPending = false,
}: ProductContentPickerProps) {
  const { supabase } = useAuth()
  const { currentOrganization } = useCurrentOrganization()
  const [items, setItems] = useState<ContentItem[]>([])
  const [search, setSearch] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialOpenRef = useRef(true)

  const loadContentPicker = useCallback(
    async (append: boolean) => {
      if (!currentOrganization?.id) return
      setLoading(true)
      try {
        const offset = append ? items.length : 0
        const { items: nextItems, hasMore: nextHasMore } =
          await fetchContentItemsForPicker(supabase, currentOrganization.id, {
            limit: 10,
            offset,
            search: search.trim() || undefined,
          })
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems))
        setHasMore(nextHasMore)
      } catch {
        setItems((prev) => (append ? prev : []))
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [supabase, currentOrganization?.id, search, items.length]
  )

  useEffect(() => {
    if (!open || !currentOrganization?.id) return
    initialOpenRef.current = true
    setItems([])
    setSearch("")
    setHasMore(false)
    loadContentPicker(false)
  }, [open, currentOrganization?.id])

  useEffect(() => {
    if (!open || !currentOrganization?.id) return
    if (initialOpenRef.current) {
      initialOpenRef.current = false
      return
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      loadContentPicker(false)
      searchDebounceRef.current = null
    }, 300)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Add lesson from content</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col px-6 pb-6 pt-2 gap-4 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1 pb-2">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 px-2 text-center">
                {search.trim()
                  ? "No results for this search."
                  : "No content in your library. Upload videos or documents from the Content page first."}
              </p>
            ) : (
              <>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onSelect(item.id, item.name)
                    }}
                    disabled={addPending}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <ContentTypeIcon type={item.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.type}
                        {item.duration != null &&
                          ` · ${formatDuration(item.duration)}`}
                      </p>
                    </div>
                  </button>
                ))}
                {hasMore && (
                  <div className="pt-4 pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => loadContentPicker(true)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Show more"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
