import { useCallback, useRef, useState } from "react"
import * as tus from "tus-js-client"
import mime from "mime"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

export type UploadStatus = "idle" | "pending" | "uploading" | "ready" | "failed"

export type UploadContentType = "video" | "pdf" | "word" | "excel" | "powerpoint"

export type UploadEntry = {
  file: File
  displayName: string
  status: UploadStatus
  progress: number
  itemId?: number
  type: UploadContentType
}

export type UseContentUploadOptions = {
  getFileContentType: (file: File) => UploadContentType | null
  validateFileSize: (file: File, type: UploadContentType) => boolean
}

type InitUploadResponseItem = {
  id: number
  type: UploadContentType
  name: string
  fileSize: number
  bunnyVideoId?: string
  tus?: {
    videoId: string
    libraryId: string
    expirationTime: number
    signature: string
    endpoint: string
  }
  storage?: {
    storageZone: string
    path: string
    url: string
  }
}

export function useContentUpload({ getFileContentType, validateFileSize }: UseContentUploadOptions) {
  const [uploadEntries, setUploadEntries] = useState<UploadEntry[]>([])
  const [uploadFolderId, setUploadFolderId] = useState<string>("root")
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false)
  const uploadTotalCountRef = useRef(0)
  const uploadFinishedCountRef = useRef(0)
  const queryClient = useQueryClient()

  const hasActiveUpload = uploadEntries.some(
    (e) => e.status === "pending" || e.status === "uploading"
  )

  const filesToUploadEntries = (files: File[]): UploadEntry[] =>
    files
      .map((file) => {
        const type = getFileContentType(file)
        if (!type) return null
        if (!validateFileSize(file, type)) return null
        return {
          file,
          displayName: file.name,
          status: "idle" as UploadStatus,
          progress: 0,
          type,
        } satisfies UploadEntry
      })
      .filter((e): e is UploadEntry => e !== null)

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const newEntries = filesToUploadEntries(Array.from(files))
    setUploadEntries((prev) => [...prev, ...newEntries])
  }

  const removeUploadEntry = (index: number) => {
    setUploadEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const setUploadEntryName = (index: number, displayName: string) => {
    setUploadEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, displayName } : e))
    )
  }

  const openUploadDialog = useCallback(
    (currentFolderId: number | null, initialFiles?: FileList | File[]) => {
      setUploadFolderId(currentFolderId == null ? "root" : String(currentFolderId))
      const files = initialFiles ? Array.from(initialFiles) : []
      if (files.length) {
        const initialEntries = filesToUploadEntries(files)
        setUploadEntries(initialEntries)
      }
      setUploadSheetOpen(true)
    },
    [getFileContentType, validateFileSize]
  )

  const startTusUploads = ({
    items,
    entriesSnapshot,
    organizationId,
  }: {
    items: InitUploadResponseItem[]
    entriesSnapshot: UploadEntry[]
    organizationId: number
  }) => {
    const checkAllUploadsFinished = () => {
      uploadFinishedCountRef.current += 1
      if (uploadFinishedCountRef.current === uploadTotalCountRef.current) {
        setUploadSheetOpen(false)
        setUploadEntries([])
        toast.success("Upload complete")
        queryClient.invalidateQueries({ queryKey: ["content", organizationId] })
      }
    }

    // Videos (TUS)
    items.forEach((item, index) => {
      const entry = entriesSnapshot[index]
      if (!entry || item.type !== "video" || !item.tus) return

      const upload = new tus.Upload(entry.file, {
        endpoint: item.tus.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          AuthorizationSignature: item.tus.signature,
          AuthorizationExpire: item.tus.expirationTime.toString(),
          VideoId: item.tus.videoId,
          LibraryId: item.tus.libraryId,
        },
        metadata: {
          filetype: entry.file.type || "video/mp4",
          title: entry.displayName || entry.file.name,
        },
        onError(error) {
          console.error("Video upload failed:", error)
          toast.error(error?.message ?? "Video upload failed")
          setUploadEntries((prev) =>
            prev.map((e, i) =>
              i === index ? { ...e, status: "failed" as UploadStatus } : e
            )
          )
          checkAllUploadsFinished()
        },
        onProgress(bytesUploaded, bytesTotal) {
          const percent = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0
          setUploadEntries((prev) =>
            prev.map((e, i) =>
              i === index
                ? { ...e, status: "uploading" as UploadStatus, progress: percent }
                : e
            )
          )
        },
        onSuccess() {
          setUploadEntries((prev) =>
            prev.map((e, i) =>
              i === index ? { ...e, status: "ready" as UploadStatus, progress: 100 } : e
            )
          )
          checkAllUploadsFinished()
        },
      })

      upload.findPreviousUploads().then((previous) => {
        if (previous.length) {
          upload.resumeFromPreviousUpload(previous[0])
        }
        upload.start()
      })
    })

    // Documents (Bunny Storage)
    items.forEach((item, index) => {
      const entry = entriesSnapshot[index]
      if (!entry || item.type === "video" || !item.storage) return

      const formData = new FormData()
      formData.append("itemId", String(item.id))
      formData.append("file", entry.file)

      setUploadEntries((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, status: "uploading" as UploadStatus, progress: 0 } : e
        )
      )

      fetch("/api/content/storage-upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Storage upload failed")
          setUploadEntries((prev) =>
            prev.map((e, i) =>
              i === index ? { ...e, status: "ready" as UploadStatus, progress: 100 } : e
            )
          )
          checkAllUploadsFinished()
        })
        .catch((error) => {
          console.error("Doc upload failed:", error)
          toast.error(error?.message ?? "Document upload failed")
          setUploadEntries((prev) =>
            prev.map((e, i) =>
              i === index ? { ...e, status: "failed" as UploadStatus } : e
            )
          )
          checkAllUploadsFinished()
        })
    })
  }

  const startUpload = async (args: { organizationId: number; folderId: number | null }) => {
    if (uploadEntries.length === 0) {
      setUploadSheetOpen(false)
      setUploadEntries([])
      return
    }

    const payload = {
      organizationId: args.organizationId,
      folderId: args.folderId,
      files: uploadEntries.map((entry) => ({
        name: entry.displayName || entry.file.name,
        originalName: entry.file.name,
        mimeType: entry.file.type || mime.getType(entry.file.name) || "application/octet-stream",
        size: entry.file.size,
        type: entry.type,
      })),
    }

    setUploadEntries((prev) =>
      prev.map((e) =>
        e.type === "video"
          ? { ...e, status: "pending", progress: 0 }
          : { ...e, status: "uploading", progress: 0 }
      )
    )
    uploadTotalCountRef.current = 0
    uploadFinishedCountRef.current = 0

    try {
      const res = await fetch("/api/content/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`Upload init failed (${res.status})`)
      }
      const data = (await res.json()) as { items: InitUploadResponseItem[] }

      setUploadEntries((prev) =>
        prev.map((entry, index) => {
          const serverItem = data.items[index]
          if (!serverItem) return entry
          return { ...entry, itemId: serverItem.id }
        })
      )

      const total = data.items.length
      uploadTotalCountRef.current = total
      uploadFinishedCountRef.current = 0

      const entriesSnapshot = [...uploadEntries]
      startTusUploads({
        items: data.items,
        entriesSnapshot,
        organizationId: args.organizationId,
      })
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Upload failed")
      setUploadEntries((prev) =>
        prev.map((e) => ({ ...e, status: "failed", progress: e.progress || 0 }))
      )
    }
  }

  return {
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
  }
}

