"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import {
  createProduct,
  deleteProduct,
  fetchProductsByOrganization,
  updateProduct,
  type Product,
  type ProductsPage,
} from "@/lib/services/products"

export function productsQueryKey(organizationId: number | null) {
  return ["products", organizationId] as const
}

export function useProducts(organizationId: number | null, page: number, pageSize: number) {
  const { supabase } = useAuth()

  const query = useQuery({
    queryKey: [...productsQueryKey(organizationId), page, pageSize],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("organizationId is required to fetch products")
      }
      return fetchProductsByOrganization(supabase, organizationId, page, pageSize)
    },
    enabled: !!organizationId,
  })

  return {
    data: (query.data ??
      ({
        items: [],
        total: 0,
      } as ProductsPage)) as ProductsPage,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useArchiveProduct(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ productId }: { productId: number }) =>
      updateProduct(supabase, productId, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey(organizationId) })
      toast.success("Product archived")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateProduct(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof createProduct>[1]) => createProduct(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey(organizationId) })
      toast.success("Product created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProduct(organizationId: number | null) {
  const { supabase } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (productId: number) => deleteProduct(supabase, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsQueryKey(organizationId) })
      toast.success("Product deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

