"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <div className="relative min-h-[60vh] w-full">
          <iframe
            src={`${url}#view=FitH`}
            title={content.name}
            className="h-[70vh] w-full rounded-lg border border-border"
            onError={() => setIframeFailed(true)}
          />
          <div className="mt-2 flex justify-end">
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 min-h-[44px]">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Preview not available in this browser
          </p>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Button className="gap-2 min-h-[44px]">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      )}
    </div>
  )
}
