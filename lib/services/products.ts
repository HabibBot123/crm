import type { SupabaseClient } from "@supabase/supabase-js"

export type ProductType = "content" | "coaching"
export type ProductStatus = "draft" | "published" | "archived"
export type DeliveryMode = "remote" | "in_person" | "hybrid"

export type Product = {
  id: number
  organization_id: number
  type: ProductType
  title: string
  slug: string | null
  description: string | null
  status: ProductStatus
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export type ProductModule = {
  id: number
  product_id: number
  title: string
  position: number
}

export type ProductModuleItem = {
  id: number
  product_module_id: number
  content_item_id: number
  title: string | null
  position: number
}

export type ProductCoaching = {
  product_id: number
  sessions_count: number
  period_months: number | null
  delivery_mode: DeliveryMode | null
}

export type ContentItemSummary = {
  id: number
  name: string
  type: string
  duration: number | null
  file_size: number | null
  upload_status: string | null
}

export type ProductModuleItemWithContent = ProductModuleItem & {
  content_items: ContentItemSummary | null
}

export type ProductModuleWithItems = ProductModule & {
  product_module_items: ProductModuleItemWithContent[]
}

export type ProductWithDetails = Product & {
  product_coaching?: ProductCoaching | null
  product_modules?: ProductModuleWithItems[]
}

export async function fetchProductsByOrganization(
  supabase: SupabaseClient,
  organizationId: number
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Product[]
}

export async function fetchProductWithDetails(
  supabase: SupabaseClient,
  productId: number
): Promise<ProductWithDetails | null> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      `
      *,
      product_coaching(*),
      product_modules(
        *,
        product_module_items(
          *,
          content_items(id, name, type, duration, file_size, upload_status)
        )
      )
    `
    )
    .eq("id", productId)
    .single()

  if (productError || !product) return null

  const p = product as Product & {
    product_coaching: ProductCoaching[] | null
    product_modules: (ProductModule & {
      product_module_items: (ProductModuleItem & {
        content_items: ContentItemSummary | ContentItemSummary[] | null
      })[]
    })[]
  }

  const modules: ProductModuleWithItems[] = (p.product_modules ?? []).map(
    (mod) => ({
      id: mod.id,
      product_id: mod.product_id,
      title: mod.title,
      position: mod.position,
      product_module_items: (mod.product_module_items ?? [])
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          product_module_id: item.product_module_id,
          content_item_id: item.content_item_id,
          title: item.title,
          position: item.position,
          content_items: Array.isArray(item.content_items)
            ? item.content_items[0] ?? null
            : item.content_items ?? null,
        })),
    })
  )
  modules.sort((a, b) => a.position - b.position)

  const coachingRow = p.product_coaching
  const product_coaching: ProductCoaching | null =
    coachingRow == null
      ? null
      : Array.isArray(coachingRow)
        ? (coachingRow[0] ?? null)
        : (coachingRow as unknown as ProductCoaching)

  return {
    id: p.id,
    organization_id: p.organization_id,
    type: p.type,
    title: p.title,
    slug: p.slug,
    description: p.description,
    status: p.status,
    cover_image_url: p.cover_image_url,
    created_at: p.created_at,
    updated_at: p.updated_at,
    product_coaching: product_coaching ?? null,
    product_modules: modules,
  }
}

export type CreateProductInput = {
  organization_id: number
  type: ProductType
  title: string
  slug?: string | null
  description?: string | null
  status?: ProductStatus
}

export async function createProduct(
  supabase: SupabaseClient,
  input: CreateProductInput
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      title: input.title.trim(),
      slug: input.slug?.trim() || null,
      description: input.description?.trim() || null,
      status: input.status ?? "draft",
    })
    .select()
    .single()

  if (error) throw error
  const product = data as Product

  if (input.type === "coaching") {
    await supabase.from("product_coaching").insert({
      product_id: product.id,
      sessions_count: 0,
      period_months: null,
      delivery_mode: null,
    })
  }

  return product
}

export type UpdateProductInput = {
  title?: string
  slug?: string | null
  description?: string | null
  status?: ProductStatus
  cover_image_url?: string | null
}

export async function updateProduct(
  supabase: SupabaseClient,
  productId: number,
  input: UpdateProductInput
): Promise<Product> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.slug !== undefined) payload.slug = input.slug?.trim() || null
  if (input.description !== undefined)
    payload.description = input.description?.trim() || null
  if (input.status !== undefined) payload.status = input.status
  if (input.cover_image_url !== undefined)
    payload.cover_image_url = input.cover_image_url

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(
  supabase: SupabaseClient,
  productId: number
): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", productId)
  if (error) throw error
}

export type CreateModuleInput = {
  title: string
  position?: number
}

export async function createModule(
  supabase: SupabaseClient,
  productId: number,
  input: CreateModuleInput
): Promise<ProductModule> {
  const position =
    input.position ?? (await getNextModulePosition(supabase, productId))
  const { data, error } = await supabase
    .from("product_modules")
    .insert({
      product_id: productId,
      title: input.title.trim(),
      position,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProductModule
}

async function getNextModulePosition(
  supabase: SupabaseClient,
  productId: number
): Promise<number> {
  const { data } = await supabase
    .from("product_modules")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
  const max = (data ?? [])[0] as { position: number } | undefined
  return max ? max.position + 1 : 0
}

export type UpdateModuleInput = {
  title?: string
  position?: number
}

export async function updateModule(
  supabase: SupabaseClient,
  moduleId: number,
  input: UpdateModuleInput
): Promise<ProductModule> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.position !== undefined) payload.position = input.position

  const { data, error } = await supabase
    .from("product_modules")
    .update(payload)
    .eq("id", moduleId)
    .select()
    .single()

  if (error) throw error
  return data as ProductModule
}

export async function deleteModule(
  supabase: SupabaseClient,
  moduleId: number
): Promise<void> {
  const { error } = await supabase
    .from("product_modules")
    .delete()
    .eq("id", moduleId)
  if (error) throw error
}

export type AddModuleItemInput = {
  content_item_id: number
  title?: string | null
  position?: number
}

async function getNextItemPosition(
  supabase: SupabaseClient,
  productModuleId: number
): Promise<number> {
  const { data } = await supabase
    .from("product_module_items")
    .select("position")
    .eq("product_module_id", productModuleId)
    .order("position", { ascending: false })
    .limit(1)
  const max = (data ?? [])[0] as { position: number } | undefined
  return max ? max.position + 1 : 0
}

export async function addModuleItem(
  supabase: SupabaseClient,
  productModuleId: number,
  input: AddModuleItemInput
): Promise<ProductModuleItem> {
  const position =
    input.position ?? (await getNextItemPosition(supabase, productModuleId))
  const { data, error } = await supabase
    .from("product_module_items")
    .insert({
      product_module_id: productModuleId,
      content_item_id: input.content_item_id,
      title: input.title?.trim() || null,
      position,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProductModuleItem
}

export type UpdateModuleItemInput = {
  title?: string | null
  position?: number
}

export async function updateModuleItem(
  supabase: SupabaseClient,
  itemId: number,
  input: UpdateModuleItemInput
): Promise<ProductModuleItem> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title?.trim() || null
  if (input.position !== undefined) payload.position = input.position

  const { data, error } = await supabase
    .from("product_module_items")
    .update(payload)
    .eq("id", itemId)
    .select()
    .single()

  if (error) throw error
  return data as ProductModuleItem
}

export async function removeModuleItem(
  supabase: SupabaseClient,
  itemId: number
): Promise<void> {
  const { error } = await supabase
    .from("product_module_items")
    .delete()
    .eq("id", itemId)
  if (error) throw error
}

export type UpsertProductCoachingInput = {
  sessions_count: number
  period_months?: number | null
  delivery_mode?: DeliveryMode | null
}

export async function upsertProductCoaching(
  supabase: SupabaseClient,
  productId: number,
  input: UpsertProductCoachingInput
): Promise<ProductCoaching> {
  const { data, error } = await supabase
    .from("product_coaching")
    .upsert(
      {
        product_id: productId,
        sessions_count: input.sessions_count,
        period_months: input.period_months ?? null,
        delivery_mode: input.delivery_mode ?? null,
      },
      { onConflict: "product_id" }
    )
    .select()
    .single()

  if (error) throw error
  return data as ProductCoaching
}
