import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  businessUnitSchema,
  businessUnitStatusSchema,
  createBusinessUnitSchema,
  updateBusinessUnitSchema,
  type BusinessUnit,
  type BusinessUnitStatus,
  type CreateBusinessUnitInput,
  type UpdateBusinessUnitInput,
} from "@/schemas/crm.schema"

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function isBusinessUnitSlugUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  if (!("code" in error) || error.code !== "23505") return false
  const message =
    "message" in error && typeof error.message === "string" ? error.message : ""
  return message.toLowerCase().includes("business_units_organization_id_slug_key")
}

const DUPLICATE_BUSINESS_UNIT_MESSAGE =
  "A business unit with this name already exists in this organization."

export async function fetchBusinessUnits(
  supabase: SupabaseClient,
  organizationId: number,
  options?: { includeArchived?: boolean }
): Promise<BusinessUnit[]> {
  let query = supabase
    .from("business_units")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })

  if (!options?.includeArchived) {
    query = query.eq("status", "active")
  }

  const { data, error } = await query
  if (error) throw error
  return z.array(businessUnitSchema).parse(data ?? [])
}

export async function createBusinessUnit(
  supabase: SupabaseClient,
  input: CreateBusinessUnitInput
): Promise<BusinessUnit> {
  const slug =
    (typeof input.slug === "string" && input.slug.trim()) ||
    slugify(input.name) ||
    "unit"

  const parsed = createBusinessUnitSchema.parse({
    ...input,
    slug,
  })

  const { data: existing, error: existingError } = await supabase
    .from("business_units")
    .select("id")
    .eq("organization_id", parsed.organization_id)
    .eq("slug", slug)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    throw new Error(DUPLICATE_BUSINESS_UNIT_MESSAGE)
  }

  const { data, error } = await supabase
    .from("business_units")
    .insert({
      organization_id: parsed.organization_id,
      name: parsed.name,
      slug,
      status: "active",
      owner_member_id: parsed.owner_member_id ?? null,
      default_commission_rate: parsed.default_commission_rate ?? null,
      default_commission_fixed: parsed.default_commission_fixed ?? null,
      settlement_basis: parsed.settlement_basis ?? "of_residual",
      payout_delay_months: parsed.payout_delay_months ?? 0,
    })
    .select("*")
    .single()

  if (error) {
    if (isBusinessUnitSlugUniqueViolation(error)) {
      throw new Error(DUPLICATE_BUSINESS_UNIT_MESSAGE)
    }
    throw error
  }
  return businessUnitSchema.parse(data)
}

export async function updateBusinessUnitStatus(
  supabase: SupabaseClient,
  id: number,
  status: BusinessUnitStatus
): Promise<BusinessUnit> {
  const parsedStatus = businessUnitStatusSchema.parse(status)
  const { data, error } = await supabase
    .from("business_units")
    .update({ status: parsedStatus })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return businessUnitSchema.parse(data)
}

export async function updateBusinessUnit(
  supabase: SupabaseClient,
  id: number,
  patch: UpdateBusinessUnitInput
): Promise<BusinessUnit> {
  const parsed = updateBusinessUnitSchema.parse(patch)
  const { data, error } = await supabase
    .from("business_units")
    .update(parsed)
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return businessUnitSchema.parse(data)
}
