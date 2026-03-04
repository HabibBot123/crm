import mime from "mime"
import type { LucideIcon } from "lucide-react"
import { Play, FileText, FileSpreadsheet, Presentation } from "lucide-react"

export type LogicalContentType = "video" | "pdf" | "word" | "excel" | "powerpoint"

// Mapping from MIME types to logical content types used in the app
export const MIME_TO_LOGICAL_TYPE: Record<string, LogicalContentType> = {
  // Video
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  // PDF
  "application/pdf": "pdf",
  // Word
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  // Excel
  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  // PowerPoint
  "application/vnd.ms-powerpoint": "powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "powerpoint",
}

const ALLOWED_MIMES = Object.keys(MIME_TO_LOGICAL_TYPE)

// Value used in <input accept="..."> for uploads
export const ACCEPTED_UPLOAD = [
  ...ALLOWED_MIMES,
  ...ALLOWED_MIMES.map((t) => mime.getExtension(t)).filter(Boolean).map((ext) => `.${ext}`),
].join(",")

export function getLogicalTypeFromMime(mimeType: string | null): LogicalContentType | null {
  if (!mimeType) return null
  return MIME_TO_LOGICAL_TYPE[mimeType] ?? null
}

export const contentTypeIcon: Record<LogicalContentType, LucideIcon> = {
  video: Play,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
}

export function getContentTypeColorClasses(type: LogicalContentType): { icon: string; bg: string } {
  switch (type) {
    case "excel":
      return { icon: "text-emerald-500", bg: "bg-emerald-50" }
    case "powerpoint":
      return { icon: "text-orange-500", bg: "bg-orange-50" }
    case "pdf":
      return { icon: "text-red-500", bg: "bg-red-50" }
    case "word":
      return { icon: "text-blue-500", bg: "bg-blue-50" }
    case "video":
      return { icon: "text-violet-500", bg: "bg-violet-50" }
    default:
      return { icon: "text-muted-foreground", bg: "bg-muted" }
  }
}

