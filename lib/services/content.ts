import type { SupabaseClient } from "@supabase/supabase-js"

export type ContentFolder = {
  id: number
  organization_id: number
  parent_id: number | null
  name: string
  created_at: string
  updated_at: string
}

export type ContentItem = {
  id: number
  organization_id: number
  folder_id: number | null
  type: "video" | "pdf" | "word" | "excel" | "powerpoint"
  name: string
  bunny_library_id: string | null
  bunny_video_id: string | null
  bunny_storage_path: string | null
  file_size: number | null
  duration: number | null
  created_at: string
  updated_at: string
  upload_status: string | null
}

export type ContentByOrganization = {
  folders: ContentFolder[]
  items: ContentItem[]
}

export async function fetchContentByOrganization(
  supabase: SupabaseClient,
  organizationId: number
): Promise<ContentByOrganization> {
  const [foldersRes, itemsRes] = await Promise.all([
    supabase
      .from("content_folders")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("content_items")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ])

  if (foldersRes.error) throw foldersRes.error
  if (itemsRes.error) throw itemsRes.error

  return {
    folders: (foldersRes.data ?? []) as ContentFolder[],
    items: (itemsRes.data ?? []) as ContentItem[],
  }
}

export type CreateContentItemInput = {
  organization_id: number
  folder_id: number | null
  type: "video" | "pdf" | "word" | "excel" | "powerpoint"
  name: string
  file_size: number | null
  upload_status?: string | null
}

export async function createContentItems(
  supabase: SupabaseClient,
  inputs: CreateContentItemInput[]
): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .insert(
      inputs.map((input) => ({
        organization_id: input.organization_id,
        folder_id: input.folder_id,
        type: input.type,
        name: input.name,
        file_size: input.file_size,
        upload_status: input.upload_status ?? "pending",
      }))
    )
    .select("*")

  if (error) throw error
  return (data ?? []) as ContentItem[]
}

export type CreateContentFolderInput = {
  organization_id: number
  name: string
  parent_id?: number | null
}

export async function createContentFolder(
  supabase: SupabaseClient,
  input: CreateContentFolderInput
): Promise<ContentFolder> {
  const { data, error } = await supabase
    .from("content_folders")
    .insert({
      organization_id: input.organization_id,
      name: input.name.trim(),
      parent_id: input.parent_id ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ContentFolder
}

export type ContentSearchResult = {
  folders: ContentFolder[]
  items: ContentItem[]
}

export function searchContent(
  allItems: ContentItem[],
  allFolders: ContentFolder[],
  query: string,
  currentFolderId: number | null
): ContentSearchResult {
  const q = query.trim().toLowerCase()

  const baseFolders = allFolders.filter((f) => f.parent_id === currentFolderId)
  const baseItems = allItems.filter((i) => i.folder_id === currentFolderId)

  if (!q) {
    return {
      folders: baseFolders,
      items: baseItems,
    }
  }

  const matches = (name: string | null | undefined) =>
    !!name && name.toLowerCase().includes(q)

  return {
    folders: baseFolders.filter((f) => matches(f.name)),
    items: allItems.filter((i) => matches(i.name)),
  }
}

export type FetchContentItemsForPickerOptions = {
  limit?: number
  offset?: number
  search?: string
}

export type FetchContentItemsForPickerResult = {
  items: ContentItem[]
  hasMore: boolean
}

export async function fetchContentItemsForPicker(
  supabase: SupabaseClient,
  organizationId: number,
  options: FetchContentItemsForPickerOptions = {}
): Promise<FetchContentItemsForPickerResult> {
  const { limit = 10, offset = 0, search } = options
  let query = supabase
    .from("content_items")
    .select("id, organization_id, folder_id, type, name, file_size, duration, upload_status, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit) // fetch limit+1 to know if there are more

  if (search?.trim()) {
    query = query.ilike("name", `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) throw error
  const list = (data ?? []) as ContentItem[]
  const hasMore = list.length > limit
  const items = hasMore ? list.slice(0, limit) : list
  return { items, hasMore }
}

