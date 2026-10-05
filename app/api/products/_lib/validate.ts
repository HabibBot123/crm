import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { assertOrgCapability } from "@/lib/api-helpers/assert-org-capability"
import { badRequest, notFound } from "@/lib/api-helpers/api-response"

export type ProductAccessData = {
  user: { id: string }
  product: { id: number; organization_id: number }
}

/**
 * Validates auth membership + `catalog.manage` for the product's organization.
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

  const organizationId = product.organization_id
  if (typeof organizationId !== "number" || !Number.isFinite(organizationId)) {
    return { ok: false, response: notFound("Product not found") }
  }

  const access = await assertOrgCapability(supabase, organizationId, "catalog.manage")
  if (!access.ok) return { ok: false, response: access.response }

  return {
    ok: true,
    data: {
      user: { id: userId },
      product: { id: product.id, organization_id: organizationId },
    },
  }
}
