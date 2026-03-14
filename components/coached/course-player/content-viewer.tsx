"use client"

import { BunnyVideoPlayer } from "./bunny-video-player"
import { PdfViewer } from "./pdf-viewer"
import { DocViewer } from "./doc-viewer"
import type { CoachedCourseContentItem } from "@/lib/services/coached"

type ContentViewerProps = {
  content: CoachedCourseContentItem
  onVideoEnded?: () => void
  className?: string
}

export function ContentViewer({
  content,
  onVideoEnded,
  className,
}: ContentViewerProps) {
  switch (content.type) {
    case "video":
      return (
        <BunnyVideoPlayer
          content={content}
          onEnded={onVideoEnded}
          className={className}
        />
      )
    case "pdf":
      return <PdfViewer content={content} className={className} />
    case "word":
    case "excel":
    case "powerpoint":
      return <DocViewer content={content} className={className} />
    default:
      return (
        <div className={className}>
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-8 text-center text-sm text-muted-foreground">
            <p>Unsupported content type</p>
          </div>
        </div>
      )
  }
}
