"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  addModuleItem,
  createModule,
  deleteModule,
  deleteProduct,
  fetchProductWithDetails,
  removeModuleItem,
  updateModule,
  updateModuleItem,
  updateProduct,
  upsertProductCoaching,
  type DeliveryMode,
  type ProductWithDetails,
} from "@/lib/services/products"
import { productsQueryKey } from "@/hooks/use-products"

export function productQueryKey(productId: number) {
  return ["product", productId] as const
}

export function useProductDetails(productId: number, enabled: boolean) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: productQueryKey(productId),
    queryFn: () => fetchProductWithDetails(supabase, productId),
    enabled,
  })

  return {
    product: (query.data ?? null) as ProductWithDetails | null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useUpdateProductDetails(organizationId: number | null, productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateProduct>[2]) =>
      updateProduct(supabase, productId, input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      if (input?.status !== undefined) {
        queryClient.invalidateQueries({ queryKey: productsQueryKey(organizationId) })
      }
      toast.success("Details saved")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateProductModule(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title: string) => createModule(supabase, productId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Module added")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProductModule(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ moduleId, title }: { moduleId: number; title: string }) =>
      updateModule(supabase, moduleId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Module updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProductModule(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (moduleId: number) => deleteModule(supabase, moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Module deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddProductLesson(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { moduleId: number; contentItemId: number; title?: string | null }) =>
      addModuleItem(supabase, input.moduleId, {
        content_item_id: input.contentItemId,
        title: input.title?.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Lesson added")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveProductLesson(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (itemId: number) => removeModuleItem(supabase, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Lesson removed")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProductLesson(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, title }: { itemId: number; title: string | null }) =>
      updateModuleItem(supabase, itemId, { title: title || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Lesson updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpsertCoachingDetails(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      sessions_count: number
      period_months: number | null
      delivery_mode: DeliveryMode | null
    }) => upsertProductCoaching(supabase, productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Coaching details saved")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDraftProduct(organizationId: number | null, productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteProduct(supabase, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey(organizationId) })
      toast.success("Product deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useReorderModules(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: { moduleId: number; position: number }[]) => {
      const offset = 10000
      for (const { moduleId, position } of updates) {
        await updateModule(supabase, moduleId, { position: position + offset })
      }
      for (const { moduleId, position } of updates) {
        await updateModule(supabase, moduleId, { position })
      }
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: productQueryKey(productId) })
      const previousProduct = queryClient.getQueryData<ProductWithDetails>(productQueryKey(productId))
      if (!previousProduct?.product_modules) return { previousProduct }
      const orderByPos = new Map(updates.map((u) => [u.moduleId, u.position]))
      const reordered = [...previousProduct.product_modules].sort(
        (a, b) =>
          (orderByPos.get(a.id) ?? a.position) - (orderByPos.get(b.id) ?? b.position)
      )
      queryClient.setQueryData<ProductWithDetails>(productQueryKey(productId), {
        ...previousProduct,
        product_modules: reordered,
      })
      return { previousProduct }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(productQueryKey(productId), context.previousProduct)
      }
      toast.error("Failed to update order")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Order updated")
    },
  })
}

export function useReorderLessons(productId: number) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { moduleId: number; updates: { itemId: number; position: number }[] }) => {
      const offset = 10000
      for (const { itemId, position } of input.updates) {
        await updateModuleItem(supabase, itemId, { position: position + offset })
      }
      for (const { itemId, position } of input.updates) {
        await updateModuleItem(supabase, itemId, { position })
      }
    },
    onMutate: async ({ moduleId, updates }) => {
      await queryClient.cancelQueries({ queryKey: productQueryKey(productId) })
      const previousProduct = queryClient.getQueryData<ProductWithDetails>(productQueryKey(productId))
      if (!previousProduct?.product_modules) return { previousProduct }
      const mod = previousProduct.product_modules.find((m) => m.id === moduleId)
      if (!mod?.product_module_items?.length) return { previousProduct }
      const orderByItem = new Map(updates.map((u) => [u.itemId, u.position]))
      const reorderedItems = [...mod.product_module_items].sort(
        (a, b) =>
          (orderByItem.get(a.id) ?? a.position) - (orderByItem.get(b.id) ?? b.position)
      )
      const newModules = previousProduct.product_modules.map((m) =>
        m.id === moduleId ? { ...m, product_module_items: reorderedItems } : m
      )
      queryClient.setQueryData<ProductWithDetails>(productQueryKey(productId), {
        ...previousProduct,
        product_modules: newModules,
      })
      return { previousProduct }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(productQueryKey(productId), context.previousProduct)
      }
      toast.error("Failed to update order")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKey(productId) })
      toast.success("Order updated")
    },
  })
}

