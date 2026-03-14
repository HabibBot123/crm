"use client"

import { FileText, FileSpreadsheet, Presentation } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CoachedCourseContentItem } from "@/lib/services/coached"

type DocViewerProps = {
  content: CoachedCourseContentItem
  className?: string
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
}

export function DocViewer({ content, className }: DocViewerProps) {
  const url = content.bunny_storage_path ?? ""
  const Icon = TYPE_ICON[content.type] ?? FileText

  if (!url) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8 text-center text-sm text-muted-foreground">
          <p>File not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/30 p-8 text-center">
        <Icon className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="font-medium text-foreground">{content.name}</p>
        {content.file_size != null && (
          <p className="text-sm text-muted-foreground mt-1">
            {formatFileSize(content.file_size)}
          </p>
        )}
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6"
        >
          <Button size="lg" className="gap-2 min-h-[44px]">
            Download
          </Button>
        </a>
      </div>
    </div>
  )
}
