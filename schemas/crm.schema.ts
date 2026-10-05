import { z } from "zod"

export const leadOriginSchema = z.enum(["form", "manual"])
export const leadStatusSchema = z.enum([
  "new",
  "booked",
  "deadline",
  "converted",
  "failed",
  "contact_later",
])

export const crmFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "multi_select",
  "number",
  "date",
  "boolean",
])

export const crmFormTypeSchema = z.enum(["default", "webinar", "freegiveaway"])
export const crmFormStatusSchema = z.enum(["draft", "active", "archived"])

export const ambassadorLinkStatusSchema = z.enum(["active", "paused", "archived"])

export const crmFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export const crmFieldSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  key: z.string(),
  label: z.string(),
  client_question: z.string(),
  field_type: crmFieldTypeSchema,
  options: z.array(crmFieldOptionSchema).nullable().optional(),
  is_required: z.boolean(),
  show_in_crm: z.boolean(),
  position: z.number(),
  created_at: z.string(),
})

export const leadStatusLogSchema = z.object({
  id: z.number(),
  lead_id: z.number(),
  from_status: leadStatusSchema.nullable(),
  to_status: leadStatusSchema,
  changed_by_member_id: z.number().nullable(),
  note: z.string().nullable(),
  created_at: z.string(),
})

export const leadAttributionSchema = z.object({
  member_id: z.number(),
  member_name: z.string().nullable(),
  attribution_type: z.enum(["closer", "setter", "ambassador", "business_unit"]),
  commission_rate: z.number().nullable(),
  commission_fixed: z.number().nullable(),
})

export const leadVisibleFieldsSchema = z.record(z.string(), z.string()).nullable()

export const leadAllFieldsSchema = z
  .record(
    z.string(),
    z.object({
      value: z.string(),
      label: z.string(),
      field_type: crmFieldTypeSchema,
    })
  )
  .nullable()

export const leadSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  form_id: z.number().nullable(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  origin: leadOriginSchema,
  status: leadStatusSchema,
  status_at: z.string(),
  created_by_member_id: z.number().nullable(),
  assigned_sales_id: z.number().nullable(),
  ambassador_link_id: z.number().nullable(),
  nylas_booking_id: z.string().nullable(),
  target_offer_id: z.number().nullable(),
  proposed_amount: z.number().nullable(),
  contact_later_at: z.string().nullable(),
  enrollment_id: z.number().nullable(),
  is_duplicate: z.boolean().default(false),
  business_unit_id: z.number().nullable().optional().default(null),
  business_unit_name: z.string().nullable().optional(),
  commissions_activated_at: z.string().nullable().optional().default(null),
  commissions_activated_by: z.number().nullable().optional().default(null),
  sale_source: z.enum(["platform", "manual"]).nullable().optional().default(null),
  created_at: z.string(),
  updated_at: z.string(),
  sales_name: z.string().nullable(),
  form_title: z.string().nullable(),
  offer_title: z.string().nullable(),
  crm_fields_visible: leadVisibleFieldsSchema,
  crm_fields_all: leadAllFieldsSchema,
  attributions: z.array(leadAttributionSchema).nullable(),
})

export const createLeadSchema = z.object({
  organization_id: z.number(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  origin: leadOriginSchema.default("manual"),
  created_by_member_id: z.number().nullable(),
  assigned_sales_id: z.number().optional().nullable(),
  target_offer_id: z.number().optional().nullable(),
})

export const updateLeadStatusSchema = z.object({
  lead_id: z.number(),
  to_status: leadStatusSchema,
  changed_by_member_id: z.number().nullable(),
  note: z.string().trim().optional().nullable(),
})

export const crmFormFieldVisibilitySchema = z.enum(["visible", "hidden"])

export const crmFormFieldSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  field_def_id: z.number(),
  position: z.number(),
  is_required: z.boolean(),
  visibility: crmFormFieldVisibilitySchema,
  label: z.string(),
  key: z.string(),
  client_question: z.string(),
  field_type: crmFieldTypeSchema,
  options: z.array(crmFieldOptionSchema).nullable().optional(),
})

export const crmFormSchema = z.object({
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
  fields: z.array(crmFormFieldSchema),
})

export const crmFormSummarySchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  title: z.string(),
  form_type: crmFormTypeSchema,
  slug: z.string(),
  status: crmFormStatusSchema,
  created_at: z.string(),
  leads_count: z.number(),
})

export const createFormSchema = z.object({
  organization_id: z.number(),
  title: z.string().min(1),
  description: z.string().trim().optional().nullable(),
  form_type: crmFormTypeSchema.default("default"),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
})

export const submitPublicFormSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().nullable(),
  /** Honeypot — must be empty. */
  website: z.string().optional().nullable(),
  field_values: z.array(
    z.object({
      fieldDefId: z.number(),
      value: z.string(),
    })
  ),
})

export const ambassadorLinkStatsSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  member_id: z.number(),
  form_id: z.number(),
  ref_code: z.string(),
  label: z.string(),
  status: ambassadorLinkStatusSchema,
  clicks_count: z.number(),
  created_at: z.string(),
  default_field_values: z
    .record(z.string(), z.string())
    .nullable()
    .optional()
    .transform((value) => value ?? {}),
  business_unit_id: z.number().nullable().optional().default(null),
  business_unit_name: z.string().nullable().optional(),
  member_email: z.string().nullable(),
  form_title: z.string(),
  form_slug: z.string(),
  leads_count: z.number(),
  converted_count: z.number(),
  last_lead_at: z.string().nullable(),
})

export const createAmbassadorLinkSchema = z.object({
  member_id: z.number(),
  form_id: z.number(),
  label: z.string().trim().min(1),
  business_unit_id: z.number().nullable().optional(),
  default_field_values: z.record(z.string(), z.string()).optional(),
})

export const businessUnitStatusSchema = z.enum(["active", "archived"])

export const businessUnitSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: businessUnitStatusSchema,
  owner_member_id: z.number().nullable().optional().default(null),
  default_commission_rate: z.number().nullable().optional().default(null),
  default_commission_fixed: z.number().nullable().optional().default(null),
  created_at: z.string(),
})

export const createBusinessUnitSchema = z.object({
  organization_id: z.number(),
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  owner_member_id: z.number().nullable().optional(),
  default_commission_rate: z.number().min(0).max(100).nullable().optional(),
  default_commission_fixed: z.number().min(0).nullable().optional(),
})

export const updateBusinessUnitSchema = z.object({
  owner_member_id: z.number().nullable().optional(),
  default_commission_rate: z.number().min(0).max(100).nullable().optional(),
  default_commission_fixed: z.number().min(0).nullable().optional(),
  name: z.string().trim().min(1).optional(),
})

export const commissionStatusSchema = z.enum(["pending", "validated", "paid", "canceled"])
export const commissionPoolSchema = z.enum(["acquisition", "delivery"])

export const commissionSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  lead_id: z.number(),
  enrollment_id: z.number().nullable(),
  manual_sale_id: z.number().nullable().optional().default(null),
  attribution_id: z.number(),
  stripe_invoice_id: z.string().nullable(),
  amount_paid: z.number(),
  commission_amount: z.number(),
  status: commissionStatusSchema,
  pool: commissionPoolSchema,
  installment_index: z.number(),
  installment_count: z.number(),
  business_unit_id: z.number().nullable().optional().default(null),
  validated_by: z.number().nullable(),
  validated_at: z.string().nullable(),
  paid_at: z.string().nullable().optional().default(null),
  paid_by: z.number().nullable().optional().default(null),
  created_at: z.string(),
  // joined
  lead_name: z.string().nullable().optional(),
  lead_email: z.string().nullable().optional(),
  member_id: z.number().nullable().optional(),
  member_name: z.string().nullable().optional(),
  attribution_type: z.enum(["closer", "setter", "ambassador", "business_unit"]).nullable().optional(),
  offer_title: z.string().nullable().optional(),
})

export const activateLeadCommissionsSchema = z.object({
  lead_id: z.number(),
  sale_source: z.enum(["platform", "manual"]),
  enrollment_id: z.number().nullable().optional(),
  activated_by_member_id: z.number(),
  /** Gross pack amount in cents. Required for manual; optional override for platform. */
  amount_gross_cents: z.number().int().positive().optional(),
  pack_title: z.string().trim().min(1).optional(),
  payment_method: z.string().trim().optional().nullable(),
  installment_count: z.number().int().min(1).optional(),
  offer_id: z.number().nullable().optional(),
})

export type Lead = z.infer<typeof leadSchema>
export type LeadStatus = z.infer<typeof leadStatusSchema>
export type LeadStatusLog = z.infer<typeof leadStatusLogSchema>
export type CrmField = z.infer<typeof crmFieldSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
export type CrmFormType = z.infer<typeof crmFormTypeSchema>
export type CrmFormStatus = z.infer<typeof crmFormStatusSchema>
export type AmbassadorLinkStatus = z.infer<typeof ambassadorLinkStatusSchema>
export type CrmFieldOption = z.infer<typeof crmFieldOptionSchema>
export type CrmFormField = z.infer<typeof crmFormFieldSchema>
export type CrmFormFieldVisibility = z.infer<typeof crmFormFieldVisibilitySchema>
export type CrmForm = z.infer<typeof crmFormSchema>
export type CrmFormSummary = z.infer<typeof crmFormSummarySchema>
export type CreateFormInput = z.infer<typeof createFormSchema>
export type SubmitPublicFormInput = z.infer<typeof submitPublicFormSchema>
export type AmbassadorLinkStats = z.infer<typeof ambassadorLinkStatsSchema>
export type CreateAmbassadorLinkInput = z.infer<typeof createAmbassadorLinkSchema>
export type BusinessUnit = z.infer<typeof businessUnitSchema>
export type CreateBusinessUnitInput = z.infer<typeof createBusinessUnitSchema>
export type UpdateBusinessUnitInput = z.infer<typeof updateBusinessUnitSchema>
export type BusinessUnitStatus = z.infer<typeof businessUnitStatusSchema>
export type Commission = z.infer<typeof commissionSchema>
export type CommissionStatus = z.infer<typeof commissionStatusSchema>
export type ActivateLeadCommissionsInput = z.infer<typeof activateLeadCommissionsSchema>
