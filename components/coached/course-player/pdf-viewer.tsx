"use client"

import { useState } from "react"
import type { CoachedCourseContentItem } from "@/lib/services/coached"

type PdfViewerProps = {
  content: CoachedCourseContentItem
  className?: string
}

export function PdfViewer({ content, className }: PdfViewerProps) {
  const [iframeFailed, setIframeFailed] = useState(false)
  const url = content.bunny_storage_path ?? ""

  if (!url) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8 text-center text-sm text-muted-foreground">
          <p>PDF not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {!iframeFailed ? (
        <iframe
          src={`${url}#view=FitH`}
          title={content.name}
          className="h-[70vh] w-full rounded-lg border border-border"
          onError={() => setIframeFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Preview not available in this browser
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open PDF
          </a>
        </div>
      )}
    </div>
  )
}
