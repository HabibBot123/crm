"use client"

import { useRef, useEffect, useCallback } from "react"
import type { CoachedCourseContentItem } from "@/lib/services/coached"

const BUNNY_EMBED_ORIGIN = "https://iframe.mediadelivery.net"

type BunnyVideoPlayerProps = {
  content: CoachedCourseContentItem
  onEnded?: () => void
  className?: string
}

export function BunnyVideoPlayer({ content, onEnded, className }: BunnyVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== BUNNY_EMBED_ORIGIN) return
    const data = event.data
    if (!data || typeof data !== "object") return
    // Player.js-style events: { event: "ended" } or { method: "event", value: "ended" }
    const ended =
      data.event === "ended" ||
      (data.method === "event" && data.value === "ended")
    if (ended) onEndedRef.current?.()
  }, [])

  useEffect(() => {
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleMessage])

  const libraryId = content.bunny_library_id ?? ""
  const videoId = content.bunny_video_id ?? ""
  if (!libraryId || !videoId) {
    return (
      <div className={className} style={{ aspectRatio: "16/9" }}>
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          Video not available
        </div>
      </div>
    )
  }

  const embedUrl = new URL(
    `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`
  )
  embedUrl.searchParams.set("responsive", "true")
  embedUrl.searchParams.set("preload", "true")
  embedUrl.searchParams.set("autoplay", "false")

  return (
    <div className={className} style={{ aspectRatio: "16/9" }}>
      <iframe
        ref={iframeRef}
        src={embedUrl.toString()}
        title={content.name}
        className="h-full w-full rounded-lg border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  )
}
