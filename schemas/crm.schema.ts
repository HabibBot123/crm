import { z } from "zod"

export const leadOriginSchema = z.enum(["form", "manual"])

/** Org-scoped status key (`new` / `lost` / `converted` + custom). */
export const leadStatusSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9_]*$/)

export const SYSTEM_LEAD_STATUS_KEYS = ["new", "lost", "converted"] as const
export type SystemLeadStatusKey = (typeof SYSTEM_LEAD_STATUS_KEYS)[number]

export const LEAD_STATUS_LABEL_MAX = 24
export const LEAD_STATUS_MAX_PER_ORG = 10

export const leadStatusColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/)

export const organizationLeadStatusSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  key: leadStatusSchema,
  label: z.string().trim().min(1).max(LEAD_STATUS_LABEL_MAX),
  color: leadStatusColorSchema,
  position: z.number(),
  is_system: z.boolean(),
  created_at: z.string(),
})

export const createOrganizationLeadStatusSchema = z.object({
  organization_id: z.number(),
  label: z.string().trim().min(1).max(LEAD_STATUS_LABEL_MAX),
  color: leadStatusColorSchema,
})

export const updateOrganizationLeadStatusSchema = z.object({
  id: z.number(),
  label: z.string().trim().min(1).max(LEAD_STATUS_LABEL_MAX).optional(),
  color: leadStatusColorSchema.optional(),
  position: z.number().int().min(0).optional(),
})

export function leadStatusKeyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "")
}

export const crmFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "select",
  "multi_select",
  "number",
  "date",
  "boolean",
])

export const crmFormStatusSchema = z.enum(["draft", "active", "archived"])

export const ambassadorLinkStatusSchema = z.enum(["active", "paused", "archived"])

export const crmFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
})

export const CRM_FIELD_FILTERABLE_MAX = 4
export const CRM_FIELD_FILTERABLE_TYPES = ["select", "multi_select", "boolean"] as const
export type CrmFieldFilterableType = (typeof CRM_FIELD_FILTERABLE_TYPES)[number]

export function isCrmFieldFilterableType(
  value: string
): value is CrmFieldFilterableType {
  return (
    value === "select" || value === "multi_select" || value === "boolean"
  )
}

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
  filterable: z.boolean().default(false),
  position: z.number(),
  created_at: z.string(),
})

export const crmLeadFieldFilterSchema = z.object({
  fieldDefId: z.number().int().positive(),
  values: z.array(z.string().trim().min(1)).min(1),
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
  owner_id: z.number().nullable(),
  ambassador_link_id: z.number().nullable(),
  nylas_booking_id: z.string().nullable(),
  target_offer_id: z.number().nullable(),
  proposed_amount: z.number().nullable(),
  contact_later_at: z.string().nullable(),
  enrollment_id: z.number().nullable(),
  organization_sale_id: z.number().nullable().optional().default(null),
  is_duplicate: z.boolean().default(false),
  business_unit_id: z.number().nullable().optional().default(null),
  business_unit_name: z.string().nullable().optional(),
  commissions_activated_at: z.string().nullable().optional().default(null),
  commissions_activated_by: z.number().nullable().optional().default(null),
  sale_source: z.enum(["platform", "manual"]).nullable().optional().default(null),
  marketing_opt_in: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
  owner_name: z.string().nullable(),
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
  owner_id: z.number().optional().nullable(),
  target_offer_id: z.number().optional().nullable(),
})

export const assignLeadOwnerSchema = z.object({
  owner_id: z.number().int().positive().nullable(),
})

export const assignLeadBusinessUnitSchema = z.object({
  business_unit_id: z.number().int().positive().nullable(),
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

/** Raw `crm_forms` row (without joined fields). */
export const crmFormRowSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: crmFormStatusSchema,
  initial_status: leadStatusSchema,
  redirect_url: z.string().nullable(),
  success_message: z.string().nullable(),
  booking_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

/** Raw `crm_form_fields` row. */
export const crmFormFieldRowSchema = z.object({
  id: z.number(),
  form_id: z.number(),
  field_def_id: z.number(),
  position: z.number(),
  is_required: z.boolean(),
  visibility: crmFormFieldVisibilitySchema.default("visible"),
})

/** Raw `crm_fields` row used when hydrating form fields. */
export const crmFieldDefRowSchema = z.object({
  id: z.number(),
  key: z.string(),
  label: z.string(),
  client_question: z.string(),
  field_type: crmFieldTypeSchema,
  options: z.array(crmFieldOptionSchema).nullable().optional(),
})

export type CrmFormRow = z.infer<typeof crmFormRowSchema>
export type CrmFormFieldRow = z.infer<typeof crmFormFieldRowSchema>
export type CrmFieldDefRow = z.infer<typeof crmFieldDefRowSchema>

export const crmFormSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: crmFormStatusSchema,
  initial_status: leadStatusSchema,
  redirect_url: z.string().nullable(),
  success_message: z.string().nullable(),
  booking_enabled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  fields: z.array(crmFormFieldSchema),
})

export const publicCrmFormPayloadSchema = z.object({
  organization: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    branding: z.record(z.string(), z.unknown()).nullable(),
  }),
  form: crmFormSchema,
})

export type PublicCrmFormPayload = z.infer<typeof publicCrmFormPayloadSchema>

export const crmFormSummarySchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: crmFormStatusSchema,
  initial_status: leadStatusSchema,
  created_at: z.string(),
  leads_count: z.number(),
})

export const createFormSchema = z.object({
  organization_id: z.number(),
  title: z.string().min(1),
  description: z.string().trim().optional().nullable(),
  initial_status: leadStatusSchema.default("new"),
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
  /** Marketing consent checkbox (required to submit). */
  marketing_opt_in: z.literal(true),
  field_values: z.array(
    z.object({
      fieldDefId: z.number(),
      value: z.string(),
    })
  ),
})

/** Raw `crm_ambassador_links` row (create / status update). */
export const ambassadorLinkRowSchema = z.object({
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

export type AmbassadorLinkRow = z.infer<typeof ambassadorLinkRowSchema>

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

export const buSettlementBasisSchema = z.enum(["of_revenue", "of_residual"])

export const businessUnitSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: businessUnitStatusSchema,
  owner_member_id: z.number().nullable().optional().default(null),
  default_commission_rate: z.number().nullable().optional().default(null),
  default_commission_fixed: z.number().nullable().optional().default(null),
  settlement_basis: buSettlementBasisSchema.optional().default("of_residual"),
  payout_delay_months: z.number().int().min(0).max(24).optional().default(0),
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
  settlement_basis: buSettlementBasisSchema.optional(),
  payout_delay_months: z.number().int().min(0).max(24).optional(),
})

export const updateBusinessUnitSchema = z.object({
  owner_member_id: z.number().nullable().optional(),
  default_commission_rate: z.number().min(0).max(100).nullable().optional(),
  default_commission_fixed: z.number().min(0).nullable().optional(),
  settlement_basis: buSettlementBasisSchema.optional(),
  payout_delay_months: z.number().int().min(0).max(24).optional(),
  name: z.string().trim().min(1).optional(),
})

export const commissionStatusSchema = z.enum(["pending", "paid", "canceled"])
export const commissionPoolSchema = z.enum(["acquisition", "delivery"])

export const commissionSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  lead_id: z.number().nullable(),
  enrollment_id: z.number().nullable(),
  organization_sale_id: z.number().nullable().optional().default(null),
  attribution_id: z.number().nullable(),
  beneficiary_member_id: z.number().nullable().optional().default(null),
  stripe_invoice_id: z.string().nullable(),
  amount_paid: z.number(),
  commission_amount: z.number(),
  status: commissionStatusSchema,
  pool: commissionPoolSchema,
  installment_index: z.number(),
  installment_count: z.number(),
  business_unit_id: z.number().nullable().optional().default(null),
  due_at: z.string().nullable().optional().default(null),
  paid_at: z.string().nullable().optional().default(null),
  paid_by: z.number().nullable().optional().default(null),
  created_at: z.string(),
  // joined
  lead_name: z.string().nullable().optional(),
  lead_email: z.string().nullable().optional(),
  member_id: z.number().nullable().optional(),
  member_name: z.string().nullable().optional(),
  attribution_type: z
    .enum(["closer", "setter", "ambassador", "business_unit", "coach"])
    .nullable()
    .optional(),
  offer_title: z.string().nullable().optional(),
})

export const commissionMemberSummarySchema = z.object({
  member_id: z.number(),
  member_name: z.string().nullable(),
  pending_count: z.number(),
  pending_cents: z.number(),
  overdue_count: z.number(),
  overdue_cents: z.number(),
  pending_ids: z.array(z.number()).default([]),
  overdue_ids: z.array(z.number()).default([]),
})

export type CommissionMemberSummary = z.infer<typeof commissionMemberSummarySchema>

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

/** Same deal inputs as activate, without locking / actor. */
export const previewLeadCommissionsSchema = activateLeadCommissionsSchema.omit({
  activated_by_member_id: true,
})

export const recordLeadSaleSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create"),
    offer_id: z.number().int().positive(),
    price_cents: z.number().int().nonnegative().optional().nullable(),
    access_duration_months: z.number().int().positive().nullable().optional(),
    /** Business sale date `YYYY-MM-DD`. Defaults to today when omitted. */
    sold_at: z.string().optional(),
  }),
  z.object({
    mode: z.literal("link"),
    enrollment_id: z.number().int().positive(),
    /** Used only when a new sale row is created for the enrollment. */
    sold_at: z.string().optional(),
  }),
  z.object({
    mode: z.literal("sale_only"),
    /** Pack price in cents */
    price_cents: z.number().int().positive(),
    /** Required: BU Owner coms resolve from the offer business unit. */
    offer_id: z.number().int().positive(),
    pack_title: z.string().trim().min(1).optional(),
    sold_at: z.string().optional(),
  }),
])

export type Lead = z.infer<typeof leadSchema>
export type LeadStatus = z.infer<typeof leadStatusSchema>
export type OrganizationLeadStatus = z.infer<typeof organizationLeadStatusSchema>
export type CreateOrganizationLeadStatusInput = z.infer<
  typeof createOrganizationLeadStatusSchema
>
export type UpdateOrganizationLeadStatusInput = z.infer<
  typeof updateOrganizationLeadStatusSchema
>
export type LeadStatusLog = z.infer<typeof leadStatusLogSchema>
export type CrmField = z.infer<typeof crmFieldSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
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
export type BuSettlementBasis = z.infer<typeof buSettlementBasisSchema>
export type Commission = z.infer<typeof commissionSchema>
export type CommissionStatus = z.infer<typeof commissionStatusSchema>
export type ActivateLeadCommissionsInput = z.infer<typeof activateLeadCommissionsSchema>
export type PreviewLeadCommissionsInput = z.infer<typeof previewLeadCommissionsSchema>
export type RecordLeadSaleInput = z.infer<typeof recordLeadSaleSchema>
