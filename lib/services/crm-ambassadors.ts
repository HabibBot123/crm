import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  ambassadorLinkStatsSchema,
  ambassadorLinkStatusSchema,
  createAmbassadorLinkSchema,
  type AmbassadorLinkStats,
  type AmbassadorLinkStatus,
  type CreateAmbassadorLinkInput,
} from "@/schemas/crm.schema"

const ambassadorLinkRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  member_id: z.number(),
  form_id: z.number(),
  ref_code: z.string(),
  label: z.string(),
  status: ambassadorLinkStatusSchema,
  clicks_count: z.number(),
  created_at: z.string(),
  default_field_values: z.record(z.string(), z.string()).nullable().optional(),
  business_unit_id: z.number().nullable().optional(),
})

function slugifyRefBase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function randomBase36Suffix(length: number): string {
  if (length <= 0) return ""
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure random generator is not available in this environment")
  }
  const bytes = new Uint8Array(length)
  cryptoObj.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

function isRefCodeUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: unknown; message?: unknown }
  return (
    maybe.code === "23505" &&
    (typeof maybe.message === "string" ? maybe.message : "").toLowerCase().includes("ref_code")
  )
}

function parseLinkStatsRows(rows: unknown[]): AmbassadorLinkStats[] {
  return z.array(ambassadorLinkStatsSchema).parse(
    (rows ?? []).map((row) => {
      if (!row || typeof row !== "object") return row
      const record = row as Record<string, unknown>
      const defaults = record.default_field_values
      return {
        ...record,
        default_field_values:
          defaults && typeof defaults === "object" && !Array.isArray(defaults)
            ? Object.fromEntries(
                Object.entries(defaults).filter(
                  (entry): entry is [string, string] => typeof entry[1] === "string"
                )
              )
            : {},
        business_unit_id:
          typeof record.business_unit_id === "number" ? record.business_unit_id : null,
        business_unit_name:
          typeof record.business_unit_name === "string" ? record.business_unit_name : null,
      }
    })
  )
}

/** Mirrors permission scope for share links (RLS remains authoritative). */
export type FetchAmbassadorLinksScope =
  | { kind: "org" }
  | { kind: "bu"; businessUnitIds: number[] }
  | { kind: "member"; memberId: number }

export async function fetchAmbassadorLinks(
  supabase: SupabaseClient,
  organizationId: number,
  scope: FetchAmbassadorLinksScope
): Promise<AmbassadorLinkStats[]> {
  let query = supabase
    .from("v_crm_ambassador_link_stats")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (scope.kind === "member") {
    query = query.eq("member_id", scope.memberId)
  } else if (scope.kind === "bu") {
    if (scope.businessUnitIds.length === 0) return []
    query = query.in("business_unit_id", scope.businessUnitIds)
  }

  const { data, error } = await query

  if (error) throw error
  return parseLinkStatsRows(data ?? [])
}

export async function createAmbassadorLink(
  supabase: SupabaseClient,
  organizationId: number,
  input: CreateAmbassadorLinkInput
) {
  const parsed = createAmbassadorLinkSchema.parse(input)
  const base = slugifyRefBase(parsed.label) || "link"
  const defaultFieldValues = parsed.default_field_values ?? {}

  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const suffix = randomBase36Suffix(6)
    const refCode = `${base}-${suffix}`

    const { data, error } = await supabase
      .from("crm_ambassador_links")
      .insert({
        organization_id: organizationId,
        member_id: parsed.member_id,
        form_id: parsed.form_id,
        label: parsed.label,
        ref_code: refCode,
        business_unit_id: parsed.business_unit_id ?? null,
        default_field_values: defaultFieldValues,
      })
      .select("*")
      .single()

    if (error) {
      if (isRefCodeUniqueViolation(error) && attempt < maxAttempts - 1) continue
      throw error
    }

    return ambassadorLinkRowSchema.parse(data)
  }

  throw new Error("Unable to generate a unique share link ref code")
}

export async function updateAmbassadorLinkStatus(
  supabase: SupabaseClient,
  id: number,
  status: AmbassadorLinkStatus
) {
  const parsedStatus = ambassadorLinkStatusSchema.parse(status)
  const { data, error } = await supabase
    .from("crm_ambassador_links")
    .update({ status: parsedStatus })
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error
  return ambassadorLinkRowSchema.parse(data)
}

export async function incrementAmbassadorLinkClicks(
  supabase: SupabaseClient,
  params: { organizationId: number; formId: number; refCode: string }
): Promise<void> {
  const ref = params.refCode.trim()
  if (!ref) return

  const { data: link, error } = await supabase
    .from("crm_ambassador_links")
    .select("id,clicks_count")
    .eq("organization_id", params.organizationId)
    .eq("form_id", params.formId)
    .eq("ref_code", ref)
    .eq("status", "active")
    .maybeSingle()

  if (error) throw error
  if (!link) return

  const nextClicks = Number(link.clicks_count ?? 0) + 1
  const { error: updateError } = await supabase
    .from("crm_ambassador_links")
    .update({ clicks_count: nextClicks })
    .eq("id", link.id)
  if (updateError) throw updateError
}
