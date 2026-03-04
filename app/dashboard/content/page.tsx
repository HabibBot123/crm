"use client"

import { useState, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload, Play, FileText, Search, Grid, List, MoreHorizontal, Download, Trash2, FolderPlus, Folder, ChevronRight, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useCurrentOrganization } from "@/components/providers/organization-provider"
import {
  fetchContentByOrganization,
  createContentFolder,
  searchContent,
  type ContentItem,
  type ContentFolder,
} from "@/lib/services/content"
import mime from "mime"
import { CreateFolderDialog } from "@/components/dashboard/content/create-folder-dialog"
import { ContentUploadSheet } from "@/components/dashboard/content/content-upload-sheet"
import { useContentUpload } from "@/hooks/content/use-content-upload"
import { getStatusBadgeStyle } from "@/lib/content-status"
import {
  ACCEPTED_UPLOAD,
  contentTypeIcon,
  getContentTypeColorClasses,
  getLogicalTypeFromMime,
  type LogicalContentType,
} from "@/lib/content-mime"

function getBreadcrumbPath(folders: ContentFolder[], currentFolderId: number | null): { id: number | null; name: string }[] {
  const path: { id: number | null; name: string }[] = [{ id: null, name: "Content Library" }]
  if (currentFolderId == null) return path
  const byId = new Map(folders.map((f) => [f.id, f]))
  const chain: ContentFolder[] = []
  let id: number | null = currentFolderId
  while (id != null) {
    const f = byId.get(id)
    if (!f) break
    chain.push(f)
    id = f.parent_id
  }
  chain.reverse()
  for (const f of chain) {
    path.push({ id: f.id, name: f.name })
  }
  return path
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return ""
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB
const MAX_DOC_BYTES = 50 * 1024 * 1024 // 50 MB

function validateFileSize(file: File, type: LogicalContentType): boolean {
  const limit = type === "video" ? MAX_VIDEO_BYTES : MAX_DOC_BYTES
  if (file.size <= limit) return true
  const formattedLimit =
    type === "video" ? "5GB par vidéo" : "50MB par document"
  toast.error(`Le fichier "${file.name}" dépasse la limite (${formattedLimit}).`)
  return false
}

function getFileContentType(file: File): LogicalContentType | null {
  const mimeType = file.type || mime.getType(file.name) || null
  return getLogicalTypeFromMime(mimeType)
}

function FolderCard({ folder, onOpen }: { folder: ContentFolder; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-xl border border-border bg-card overflow-hidden text-left transition-colors hover:bg-muted/30 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-primary/5">
        <Folder className="h-10 w-10 text-primary/40" />
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">Folder</p>
      </div>
    </button>
  )
}

function FolderRow({ folder, onOpen, isLast }: { folder: ContentFolder; onOpen: () => void; isLast?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20",
        !isLast && "border-b border-border"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Folder className="h-4 w-4 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground">Folder</p>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">Folder</Badge>
    </button>
  )
}

export default function ContentPage() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderParentId, setNewFolderParentId] = useState<string>("root")
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const { currentOrganization } = useCurrentOrganization()
  const {
    uploadEntries,
    setUploadEntries,
    uploadFolderId,
    setUploadFolderId,
    uploadSheetOpen,
    setUploadSheetOpen,
    hasActiveUpload,
    addFiles,
    removeUploadEntry,
    setUploadEntryName,
    openUploadDialog,
    startUpload,
  } = useContentUpload({
    getFileContentType,
    validateFileSize,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["content", currentOrganization?.id],
    queryFn: () => fetchContentByOrganization(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  })

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: number | null }) =>
      createContentFolder(supabase, {
        organization_id: currentOrganization!.id,
        name,
        parent_id: parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", currentOrganization?.id] })
      setCreateFolderOpen(false)
      setNewFolderName("")
      setNewFolderParentId("root")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch("/api/content/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        let message = "Failed to delete content item"
        try {
          const data = JSON.parse(text)
          if (data?.error) message = data.error
        } catch {
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", currentOrganization?.id] })
      toast.success("Content deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const allItems = data?.items ?? []
  const folders = data?.folders ?? []

  const { folders: visibleFolders, items: visibleItems } = searchContent(
    allItems,
    folders,
    searchQuery,
    currentFolderId
  )

  const subfolders = visibleFolders.sort((a, b) => a.name.localeCompare(b.name))
  const currentItems = visibleItems

  const breadcrumb = getBreadcrumbPath(folders, currentFolderId)

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name || !currentOrganization) return
    createFolderMutation.mutate({
      name,
      parentId: newFolderParentId === "root" ? null : Number(newFolderParentId),
    })
  }

  const openCreateFolderInCurrent = () => {
    setNewFolderParentId(currentFolderId == null ? "root" : String(currentFolderId))
    setCreateFolderOpen(true)
  }

  const handleUploadSubmit = () => {
    if (!currentOrganization) {
      setUploadSheetOpen(false)
      setUploadEntries([])
      return
    }

    startUpload({
      organizationId: currentOrganization.id,
      folderId: uploadFolderId === "root" ? null : Number(uploadFolderId),
    })
  }

  if (!currentOrganization) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">Select an organization to view content.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Content Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Loading…" : error ? "Error loading content" : `${folders.length} folder${folders.length !== 1 ? "s" : ""}, ${allItems.length} file${allItems.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => openUploadDialog(currentFolderId)}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
          <Button variant="outline" className="gap-2" onClick={openCreateFolderInCurrent}>
            <FolderPlus className="h-4 w-4" />
            New folder
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {!isLoading && !error && (
        <nav className="mt-4 flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id ?? "root"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />}
              <button
                type="button"
                onClick={() => setCurrentFolderId(crumb.id)}
                className={cn(
                  "hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[180px]",
                  i === breadcrumb.length - 1 && "font-medium text-foreground cursor-default hover:text-foreground"
                )}
                title={crumb.name}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        folders={folders}
        newFolderName={newFolderName}
        newFolderParentId={newFolderParentId}
        setNewFolderName={setNewFolderName}
        setNewFolderParentId={setNewFolderParentId}
        handleCreateFolder={handleCreateFolder}
        isCreating={createFolderMutation.isPending}
      />

      <ContentUploadSheet
        open={uploadSheetOpen}
        onOpenChange={(open: boolean) => {
          setUploadSheetOpen(open)
          if (!open) setUploadEntries([])
        }}
        folders={folders}
        uploadFolderId={uploadFolderId}
        setUploadFolderId={setUploadFolderId}
        uploadEntries={uploadEntries}
        addFiles={addFiles}
        setUploadEntryName={setUploadEntryName}
        removeUploadEntry={removeUploadEntry}
        hasActiveUpload={hasActiveUpload}
        handleUploadSubmit={handleUploadSubmit}
        fileInputRef={fileInputRef}
        accept={ACCEPTED_UPLOAD}
        formatFileSize={formatFileSize}
      />

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and folders..."
            className="pl-9"
          />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="px-2">
              <Grid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list" className="px-2">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Failed to load content. Try again later.
        </div>
      ) : view === "grid" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subfolders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onOpen={() => setCurrentFolderId(folder.id)} />
          ))}
          {currentItems.map((item) => (
            <ContentCard key={item.id} item={item} deleteItem={(id) => deleteItemMutation.mutate(id)} />
          ))}
          {subfolders.length === 0 && currentItems.length === 0 && (
            <div
              className="col-span-full rounded-xl border-2 border-dashed border-border bg-muted/20 p-10 text-center"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const files = e.dataTransfer?.files
                if (files?.length) openUploadDialog(currentFolderId, files)
              }}
            >
              <Folder className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">This folder is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentFolderId == null ? "Create a folder or upload files to get started." : "Upload files or create a subfolder."}
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={openCreateFolderInCurrent}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New folder
                </Button>
                <Button size="sm" onClick={() => openUploadDialog(currentFolderId)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
          {subfolders.map((folder, idx) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onOpen={() => setCurrentFolderId(folder.id)}
              isLast={currentItems.length === 0 && idx === subfolders.length - 1}
            />
          ))}
          {currentItems.map((item, i) => (
            <ContentRow
              key={item.id}
              item={item}
              isLast={i === currentItems.length - 1}
              deleteItem={(id) => deleteItemMutation.mutate(id)}
            />
          ))}
          {subfolders.length === 0 && currentItems.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              This folder is empty. Create a folder or upload files to get started.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContentCard({
  item,
  deleteItem,
}: {
  item: ContentItem
  deleteItem: (id: number) => void
}) {
  const logicalType = item.type as LogicalContentType
  const Icon = contentTypeIcon[logicalType] ?? FileText
  const { icon: iconColor, bg: bgColor } = getContentTypeColorClasses(logicalType)
  const sizeStr = formatFileSize(item.file_size)
  const durationStr = formatDuration(item.duration)
  const status = getStatusBadgeStyle(item.upload_status as any)
  const downloadUrl = item.type !== "video" ? item.bunny_storage_path : null
  return (
    <div className="group rounded-xl border border-border bg-card overflow-hidden">
      <div
        className={cn(
          "relative aspect-[4/3] flex items-center justify-center",
          bgColor
        )}
      >
        <Badge
          variant="outline"
          className={cn(
            "absolute left-2 top-2 z-10 px-2 py-0.5 text-[10px] font-medium capitalize border",
            status.className
          )}
        >
          {status.label}
        </Badge>
        <Icon className={cn("h-10 w-10", iconColor)} />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs capitalize">
            {item.type}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {downloadUrl && (
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => window.open(downloadUrl, "_blank")}
                >
                  <Download className="h-4 w-4" /> Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteItem(item.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="mt-2 text-sm font-medium text-foreground truncate">{item.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {sizeStr}
          {durationStr ? ` · ${durationStr}` : ""}
        </p>
      </div>
    </div>
  )
}

function ContentRow({
  item,
  isLast,
  deleteItem,
}: {
  item: ContentItem
  isLast: boolean
  deleteItem: (id: number) => void
}) {
  const logicalType = item.type as LogicalContentType
  const Icon = contentTypeIcon[logicalType] ?? FileText
  const { icon: iconColor, bg: bgColor } = getContentTypeColorClasses(logicalType)
  const status = getStatusBadgeStyle(item.upload_status as any)
  const downloadUrl = item.type !== "video" ? item.bunny_storage_path : null
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3.5",
        !isLast && "border-b border-border"
      )}
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgColor)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
        <span>{formatFileSize(item.file_size)}</span>
        {item.duration != null && <span>{formatDuration(item.duration)}</span>}
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-medium capitalize border",
          status.className
        )}
      >
        {status.label}
      </Badge>
      <Badge variant="secondary" className="text-xs capitalize">
        {item.type}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {downloadUrl && (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => window.open(downloadUrl, "_blank")}
            >
              <Download className="h-4 w-4" /> Download
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteItem(item.id)}>
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
