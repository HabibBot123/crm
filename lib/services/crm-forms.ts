import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  createFormSchema,
  crmFieldOptionSchema,
  crmFieldTypeSchema,
  crmFormFieldSchema,
  crmFormFieldVisibilitySchema,
  crmFormSchema,
  crmFormStatusSchema,
  crmFormSummarySchema,
  crmFormTypeSchema,
  type CreateFormInput,
  type CrmForm,
  type CrmFormField,
  type CrmFormFieldVisibility,
  type CrmFormStatus,
  type CrmFormSummary,
} from "@/schemas/crm.schema"

const crmFormRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  form_type: crmFormTypeSchema,
  slug: z.string(),
  status: crmFormStatusSchema,
  redirect_url: z.string().nullable(),
  success_message: z.string().nullable(),
  booking_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

const crmFormFieldRowSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  field_def_id: z.number(),
  position: z.number(),
  is_required: z.boolean(),
  visibility: crmFormFieldVisibilitySchema.default("visible"),
})

const crmFieldDefRowSchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  client_question: z.string(),
  field_type: crmFieldTypeSchema,
  options: z.array(crmFieldOptionSchema).nullable().optional(),
})

export type PublicCrmForm = {
  organization: {
    id: number
    name: string
    slug: string
    branding: Record<string, unknown> | null
  }
  form: CrmForm
}

const publicCrmFormPayloadSchema = z.object({
  organization: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    branding: z.record(z.string(), z.unknown()).nullable(),
  }),
  form: crmFormSchema,
})

export async function fetchPublicFormBySlug(
  baseUrl: string,
  orgSlug: string,
  formSlug: string,
  refCode?: string | null
): Promise<PublicCrmForm | null> {
  const base = baseUrl.trim().replace(/\/$/, "")
  const normalizedOrgSlug = orgSlug.trim().toLowerCase()
  const normalizedFormSlug = formSlug.trim().toLowerCase()
  const url = new URL(
    `/api/public/org/${encodeURIComponent(normalizedOrgSlug)}/form/${encodeURIComponent(normalizedFormSlug)}`,
    base
  )
  if (refCode?.trim()) {
    url.searchParams.set("ref", refCode.trim())
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const bodyUnknown: unknown = await res.json().catch(() => null)
    const parsed = z.object({ error: z.string().optional() }).safeParse(bodyUnknown)
    const message = parsed.success ? (parsed.data.error ?? "Unable to load form") : "Unable to load form"
    throw new Error(message)
  }

  const rawUnknown: unknown = await res.json()
  return publicCrmFormPayloadSchema.parse(rawUnknown)
}

function toCrmFormField(
  row: z.infer<typeof crmFormFieldRowSchema>,
  fieldDef: z.infer<typeof crmFieldDefRowSchema>
): CrmFormField {
  return crmFormFieldSchema.parse({
    id: row.id,
    form_id: row.form_id,
    field_def_id: row.field_def_id,
    position: row.position,
    is_required: row.is_required,
    visibility: row.visibility,
    label: fieldDef.label,
    key: fieldDef.key,
    client_question: fieldDef.client_question,
    field_type: fieldDef.field_type,
    options: fieldDef.options,
  })
}

export async function fetchForms(
  supabase: SupabaseClient,
  organizationId: number
): Promise<CrmFormSummary[]> {
  const { data, error } = await supabase
    .from("v_crm_forms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return z.array(crmFormSummarySchema).parse(data ?? [])
}

export async function fetchFormWithFields(
  supabase: SupabaseClient,
  formId: number,
  options?: { publicOnlyVisible?: boolean }
): Promise<CrmForm | null> {
  const { data: formData, error: formError } = await supabase
    .from("crm_forms")
    .select("*")
    .eq("id", formId)
    .maybeSingle()
  if (formError) throw formError
  if (!formData) return null

  const formRow = crmFormRowSchema.parse(formData)

  const { data: formFieldData, error: formFieldError } = await supabase
    .from("crm_form_fields")
    .select("id,form_id,field_def_id,position,is_required,visibility")
    .eq("form_id", formId)
    .order("position", { ascending: true })
    .order("id", { ascending: true })
  if (formFieldError) throw formFieldError

  const formFieldRows = z.array(crmFormFieldRowSchema).parse(formFieldData ?? [])
  const fieldDefIds = formFieldRows.map((row) => row.field_def_id)

  const fieldDefsById = new Map<number, z.infer<typeof crmFieldDefRowSchema>>()
  if (fieldDefIds.length > 0) {
    const { data: fieldDefData, error: fieldDefError } = await supabase
      .from("crm_fields")
      .select("id,key,label,client_question,field_type,options")
      .in("id", fieldDefIds)
    if (fieldDefError) throw fieldDefError
    const parsedFieldDefs = z.array(crmFieldDefRowSchema).parse(fieldDefData ?? [])
    for (const row of parsedFieldDefs) {
      fieldDefsById.set(row.id, row)
    }
  }

  const fields = formFieldRows
    .map((row) => {
      const fieldDef = fieldDefsById.get(row.field_def_id)
      if (!fieldDef) return null
      return toCrmFormField(row, fieldDef)
    })
    .filter((row): row is CrmFormField => row !== null)
    .filter((row) => (options?.publicOnlyVisible ? row.visibility === "visible" : true))

  return crmFormSchema.parse({
    ...formRow,
    success_message: formRow.success_message ?? null,
    fields,
  })
}

export async function createForm(
  supabase: SupabaseClient,
  input: CreateFormInput
): Promise<number> {
  const payload = createFormSchema.parse(input)
  const { data, error } = await supabase
    .from("crm_forms")
    .insert(payload)
    .select("id")
    .single()
  if (error) throw error
  return Number(data.id)
}

export async function updateForm(
  supabase: SupabaseClient,
  formId: number,
  patch: {
    title?: string
    description?: string | null
    status?: CrmFormStatus
    redirect_url?: string | null
    success_message?: string | null
  }
): Promise<void> {
  const updatePatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) updatePatch.title = patch.title
  if (patch.description !== undefined) updatePatch.description = patch.description
  if (patch.status !== undefined) updatePatch.status = patch.status
  if (patch.success_message !== undefined) updatePatch.success_message = patch.success_message

  if (patch.redirect_url !== undefined) {
    const { data: formRow, error: formError } = await supabase
      .from("crm_forms")
      .select("form_type")
      .eq("id", formId)
      .single()
    if (formError) throw formError

    const formType = crmFormTypeSchema.parse(formRow.form_type)
    updatePatch.redirect_url = formType === "default" ? patch.redirect_url : null
  }

  const { error } = await supabase.from("crm_forms").update(updatePatch).eq("id", formId)
  if (error) throw error
}

export async function addFieldToForm(
  supabase: SupabaseClient,
  input: {
    formId: number
    fieldDefId: number
    position: number
    isRequired: boolean
    visibility?: CrmFormFieldVisibility
  }
): Promise<void> {
  const { error } = await supabase.from("crm_form_fields").insert({
    form_id: input.formId,
    field_def_id: input.fieldDefId,
    position: input.position,
    is_required: input.isRequired,
    visibility: input.visibility ?? "visible",
  })
  if (error) throw error
}

export async function updateFormField(
  supabase: SupabaseClient,
  formFieldId: number,
  patch: {
    isRequired?: boolean
    visibility?: CrmFormFieldVisibility
    position?: number
  }
): Promise<void> {
  const updatePatch: Record<string, unknown> = {}
  if (patch.isRequired !== undefined) updatePatch.is_required = patch.isRequired
  if (patch.visibility !== undefined) updatePatch.visibility = patch.visibility
  if (patch.position !== undefined) updatePatch.position = patch.position
  if (Object.keys(updatePatch).length === 0) return

  const { error } = await supabase.from("crm_form_fields").update(updatePatch).eq("id", formFieldId)
  if (error) throw error
}

export async function removeFieldFromForm(
  supabase: SupabaseClient,
  formFieldId: number
): Promise<void> {
  const { error } = await supabase.from("crm_form_fields").delete().eq("id", formFieldId)
  if (error) throw error
}

export async function fetchPublicForm(
  adminSupabase: SupabaseClient,
  orgSlug: string,
  formSlug: string
): Promise<PublicCrmForm | null> {
  const normalizedOrgSlug = orgSlug.trim().toLowerCase()
  const normalizedFormSlug = formSlug.trim().toLowerCase()

  const { data: orgData, error: orgError } = await adminSupabase
    .from("organizations")
    .select("id,name,slug,branding")
    .eq("slug", normalizedOrgSlug)
    .is("deleted_at", null)
    .maybeSingle()
  if (orgError) throw orgError
  if (!orgData) return null

  const { data: formData, error: formError } = await adminSupabase
    .from("crm_forms")
    .select("*")
    .eq("organization_id", orgData.id)
    .eq("slug", normalizedFormSlug)
    .eq("status", "active")
    .maybeSingle()
  if (formError) throw formError
  if (!formData) return null

  const formId = z.object({ id: z.number() }).parse(formData).id
  const form = await fetchFormWithFields(adminSupabase, formId, { publicOnlyVisible: true })
  if (!form) return null

  return {
    organization: {
      id: z.object({ id: z.number() }).parse(orgData).id,
      name: z.object({ name: z.string() }).parse(orgData).name,
      slug: z.object({ slug: z.string() }).parse(orgData).slug,
      branding:
        orgData.branding && typeof orgData.branding === "object"
          ? Object.fromEntries(Object.entries(orgData.branding))
          : null,
    },
    form,
  }
}
