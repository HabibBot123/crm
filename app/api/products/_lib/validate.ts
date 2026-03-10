import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { badRequest, forbidden, notFound } from "@/lib/api-helpers/api-response"

export type ProductAccessData = {
  user: { id: string }
  product: { id: number; organization_id: number }
}

/**
 * Validates that the user is authenticated and has access to the product
 * (member of the product's organization). Use in product API routes.
 */
export async function validateProductAccess(
  supabase: SupabaseClient,
  userId: string,
  productId: number
): Promise<
  | { ok: true; data: ProductAccessData }
  | { ok: false; response: NextResponse }
> {
  if (!productId || !Number.isFinite(productId)) {
    return { ok: false, response: badRequest("Invalid product id") }
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, organization_id")
    .eq("id", productId)
    .single()

  if (productError || !product) {
    return {
      ok: false,
      response: notFound(productError?.message ?? "Product not found"),
    }
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("organization_id", product.organization_id)
    .maybeSingle()

  if (!membership) {
    return { ok: false, response: forbidden("Forbidden") }
  }

  return {
    ok: true,
    data: {
      user: { id: userId },
      product: product as { id: number; organization_id: number },
    },
  }
}
