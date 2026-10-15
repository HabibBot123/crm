"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ContentViewer } from "@/components/coached/course-player/content-viewer"
import { formatContentTypeLabel } from "@/lib/content-mime"
import type { ContentItem } from "@/lib/services/content"
import type { CoachedCourseContentItem } from "@/lib/services/coached"

type ContentPreviewSheetProps = {
  item: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toViewerContent(item: ContentItem): CoachedCourseContentItem {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    duration: item.duration,
    file_size: item.file_size,
    upload_status: item.upload_status,
    bunny_library_id: item.bunny_library_id,
    bunny_video_id: item.bunny_video_id,
    bunny_storage_path: item.bunny_storage_path,
  }
}

export function ContentPreviewSheet({
  item,
  open,
  onOpenChange,
}: ContentPreviewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="min-w-0 space-y-1 pr-8">
            <SheetTitle className="truncate text-base">
              {item?.name ?? "Preview"}
            </SheetTitle>
            {item ? (
              <Badge variant="secondary" className="text-xs">
                {formatContentTypeLabel(item.type)}
              </Badge>
            ) : null}
          </div>
        </SheetHeader>
        <div className="flex-1 p-5">
          {item ? (
            <ContentViewer content={toViewerContent(item)} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
