import {
  Play,
  FileText,
  FileSpreadsheet,
  Presentation,
} from "lucide-react"

export const CONTENT_TYPE_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  video: Play,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  powerpoint: Presentation,
}

export function ContentTypeIcon({ type }: { type: string }) {
  const Icon = CONTENT_TYPE_ICON[type] ?? FileText
  return <Icon className="h-3.5 w-3.5 text-muted-foreground" />
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
