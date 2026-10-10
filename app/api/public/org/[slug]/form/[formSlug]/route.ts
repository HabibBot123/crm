import { z } from "zod"
import { badRequest, jsonResponse, notFound, ok, serverError } from "@/lib/api-helpers/api-response"
import { incrementAmbassadorLinkClicks } from "@/lib/services/crm-ambassadors"
import { fetchFormWithFields, fetchPublicForm } from "@/lib/services/crm-forms"
import { createAdminClient } from "@/lib/supabase/admin"
import { submitPublicFormSchema } from "@/schemas/crm.schema"

const PUBLIC_CACHE_SECONDS = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 3

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/)

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; formSlug: string }> }
) {
  try {
    const { slug, formSlug } = await context.params
    const normalizedOrgSlug = slugSchema.parse(slug)
    const normalizedFormSlug = slugSchema.parse(formSlug)

    const supabase = createAdminClient()
    const data = await fetchPublicForm(supabase, normalizedOrgSlug, normalizedFormSlug)
    if (!data) {
      return notFound("Form not found")
    }

    const url = new URL(request.url)
    const ref = url.searchParams.get("ref")?.trim() ?? ""
    if (ref.length > 0) {
      await incrementAmbassadorLinkClicks(supabase, {
        organizationId: data.organization.id,
        formId: data.form.id,
        refCode: ref,
      })
    }

    const response = jsonResponse(200, data)
    if (ref.length > 0) {
      response.headers.set("Cache-Control", "no-store")
    } else {
      response.headers.set(
        "Cache-Control",
        `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_SECONDS}`
      )
    }
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid request", error.flatten())
    }
    return serverError("Failed to load form", error instanceof Error ? error.message : error)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; formSlug: string }> }
) {
  try {
    const { slug, formSlug } = await context.params
    const normalizedOrgSlug = slugSchema.parse(slug)
    const normalizedFormSlug = slugSchema.parse(formSlug)

    const body = await request.json().catch(() => null)
    const payload = submitPublicFormSchema.parse(body)

    if (payload.website != null && payload.website.trim().length > 0) {
      return ok({ leadId: 0 })
    }

    const supabase = createAdminClient()

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", normalizedOrgSlug)
      .is("deleted_at", null)
      .maybeSingle()
    if (orgError) throw orgError
    if (!organization) return notFound("Organization not found")

    const { data: form, error: formError } = await supabase
      .from("crm_forms")
      .select("id, initial_status")
      .eq("organization_id", organization.id)
      .eq("slug", normalizedFormSlug)
      .eq("status", "active")
      .maybeSingle()
    if (formError) throw formError
    if (!form) return notFound("Form not found")

    const initialStatus =
      typeof form.initial_status === "string" && form.initial_status.trim().length > 0
        ? form.initial_status
        : "new"

    const emailNormalized = payload.email.trim().toLowerCase()
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count: recentCount, error: rateError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .ilike("email", emailNormalized)
      .gte("created_at", windowStart)
    if (rateError) throw rateError
    if ((recentCount ?? 0) >= RATE_LIMIT_MAX) {
      return badRequest("Too many submissions. Please try again in a minute.")
    }

    const formWithFields = await fetchFormWithFields(supabase, form.id)
    if (!formWithFields) return notFound("Form not found")

    const url = new URL(request.url)
    const ref = url.searchParams.get("ref")?.trim() ?? ""

    let ambassadorLinkId: number | null = null
    let ambassadorMemberId: number | null = null
    let businessUnitId: number | null = null
    let linkDefaults: Record<string, string> = {}

    if (ref.length > 0) {
      const { data: link, error: linkError } = await supabase
        .from("crm_ambassador_links")
        .select("id,member_id,business_unit_id,default_field_values")
        .eq("organization_id", organization.id)
        .eq("form_id", form.id)
        .eq("ref_code", ref)
        .eq("status", "active")
        .maybeSingle()
      if (linkError) throw linkError
      if (link) {
        ambassadorLinkId = Number(link.id)
        ambassadorMemberId = Number(link.member_id)
        businessUnitId =
          typeof link.business_unit_id === "number" ? link.business_unit_id : null
        if (
          link.default_field_values &&
          typeof link.default_field_values === "object" &&
          !Array.isArray(link.default_field_values)
        ) {
          linkDefaults = Object.fromEntries(
            Object.entries(link.default_field_values).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string"
            )
          )
        }
      }
    }

    const queryPrefills: Record<string, string> = {}
    for (const field of formWithFields.fields) {
      if (field.visibility !== "hidden") continue
      const fromQuery = url.searchParams.get(field.key)?.trim()
      if (fromQuery) queryPrefills[field.key] = fromQuery
    }

    const submittedByDefId = new Map<number, string>()
    for (const item of payload.field_values) {
      submittedByDefId.set(item.fieldDefId, item.value)
    }

    const mergedValues: Array<{ fieldDefId: number; value: string }> = []
    for (const field of formWithFields.fields) {
      if (field.visibility === "hidden") {
        const fromLink = linkDefaults[field.key]?.trim() ?? ""
        const fromQuery = queryPrefills[field.key]?.trim() ?? ""
        const value = fromQuery || fromLink
        if (value.length > 0) {
          mergedValues.push({ fieldDefId: field.field_def_id, value })
        }
        continue
      }

      const submitted = submittedByDefId.get(field.field_def_id)?.trim() ?? ""
      if (field.is_required && !submitted) {
        return badRequest("Please fill all required fields.")
      }
      if (submitted.length > 0) {
        mergedValues.push({ fieldDefId: field.field_def_id, value: submitted })
      }
    }

    const { count: existingCount, error: dupError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .ilike("email", emailNormalized)
    if (dupError) throw dupError
    const isDuplicate = (existingCount ?? 0) > 0

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: organization.id,
        form_id: form.id,
        full_name: payload.full_name,
        email: emailNormalized,
        phone: payload.phone ?? null,
        origin: "form",
        status: initialStatus,
        ambassador_link_id: ambassadorLinkId,
        business_unit_id: businessUnitId,
        is_duplicate: isDuplicate,
        created_by_member_id: null,
      })
      .select("id")
      .single()
    if (leadError) throw leadError

    const leadId = Number(leadRow.id)
    if (mergedValues.length > 0) {
      const rows = mergedValues.map((item) => ({
        lead_id: leadId,
        field_def_id: item.fieldDefId,
        value: item.value,
      }))
      const { error: valuesError } = await supabase.from("lead_field_values").insert(rows)
      if (valuesError) throw valuesError
    }

    if (ambassadorMemberId != null) {
      const { data: memberDefaults, error: memberDefaultsError } = await supabase
        .from("organization_members")
        .select("default_commission_rate_ambassador, default_commission_fixed_ambassador")
        .eq("id", ambassadorMemberId)
        .maybeSingle()
      if (memberDefaultsError) throw memberDefaultsError

      const commissionRate =
        memberDefaults?.default_commission_rate_ambassador == null
          ? null
          : Number(memberDefaults.default_commission_rate_ambassador)
      const commissionFixed =
        memberDefaults?.default_commission_fixed_ambassador == null
          ? null
          : Number(memberDefaults.default_commission_fixed_ambassador)

      const { error: attributionError } = await supabase.from("lead_attributions").insert({
        lead_id: leadId,
        member_id: ambassadorMemberId,
        attribution_type: "ambassador",
        commission_rate:
          commissionRate != null && Number.isFinite(commissionRate) ? commissionRate : null,
        commission_fixed:
          commissionFixed != null && Number.isFinite(commissionFixed) ? commissionFixed : null,
      })
      if (attributionError) throw attributionError
    }

    return ok({ leadId, isDuplicate })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid form submission", error.flatten())
    }
    return serverError("Failed to submit form", error instanceof Error ? error.message : error)
  }
}
