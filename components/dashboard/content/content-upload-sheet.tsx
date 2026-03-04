import type React from "react"
import { Upload, FileText, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ContentFolder } from "@/lib/services/content"
import type { UploadEntry } from "@/hooks/content/use-content-upload"

type ContentUploadSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: ContentFolder[]
  uploadFolderId: string
  setUploadFolderId: (value: string) => void
  uploadEntries: UploadEntry[]
  addFiles: (files: FileList | null) => void
  setUploadEntryName: (index: number, displayName: string) => void
  removeUploadEntry: (index: number) => void
  hasActiveUpload: boolean
  handleUploadSubmit: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  accept: string
  formatFileSize: (bytes: number | null) => string
}

export function ContentUploadSheet({
  open,
  onOpenChange,
  folders,
  uploadFolderId,
  setUploadFolderId,
  uploadEntries,
  addFiles,
  setUploadEntryName,
  removeUploadEntry,
  hasActiveUpload,
  handleUploadSubmit,
  fileInputRef,
  accept,
  formatFileSize,
}: ContentUploadSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-xl"
        closeDisabled={hasActiveUpload}
      >
        <SheetHeader>
          <SheetTitle>Upload files</SheetTitle>
          <SheetDescription>
            Add videos (MP4, MOV) or PDFs. Choose the destination folder and edit file names if needed.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-2 px-4 shrink-0">
          <Label>Destination folder</Label>
          <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">Root (Content Library)</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Max 5GB per video, 50MB per document.
          </p>
        </div>
        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="grid gap-4 py-4 pr-2">
            <div className="grid gap-2">
              <Label>Files</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.add("border-primary/50", "bg-primary/5")
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.remove("border-primary/50", "bg-primary/5")
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.currentTarget.classList.remove("border-primary/50", "bg-primary/5")
                  addFiles(e.dataTransfer?.files ?? null)
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 py-6 text-center transition-colors hover:bg-muted/40 hover:border-muted-foreground/30"
              >
                <Plus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Add files</span>
                <span className="text-xs text-muted-foreground">or drag and drop</span>
              </button>
              {uploadEntries.length > 0 && (
                <div className="space-y-1">
                  {uploadEntries.map((entry, index) => {
                    const Icon = entry.type === "video" ? Upload : FileText
                    return (
                      <div
                        key={`${entry.file.name}-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                          value={entry.displayName}
                          onChange={(e) => setUploadEntryName(index, e.target.value)}
                          className="h-9 flex-1 min-w-0 text-sm"
                          placeholder="File name"
                        />
                        <span className="text-xs text-muted-foreground shrink-0 w-20 text-right">
                          {formatFileSize(entry.file.size)}
                          {entry.status === "uploading" && ` · ${entry.progress}%`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => removeUploadEntry(index)}
                          aria-label="Remove"
                          disabled={hasActiveUpload}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={hasActiveUpload}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUploadSubmit}
            disabled={uploadEntries.length === 0 || hasActiveUpload}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {hasActiveUpload
              ? "Uploading…"
              : `Upload${uploadEntries.length > 0 ? ` (${uploadEntries.length})` : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

