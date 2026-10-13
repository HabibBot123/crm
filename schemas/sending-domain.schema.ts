import { z } from "zod"

export const sendingDomainStatusSchema = z.enum([
  "pending",
  "verified",
  "failed",
  "temporary_failure",
  "not_started",
])

export const sendingDomainRegionSchema = z.enum([
  "us-east-1",
  "eu-west-1",
  "sa-east-1",
  "ap-northeast-1",
])

export const sendingDomainDnsRecordSchema = z.object({
  record: z.string(),
  name: z.string(),
  value: z.string(),
  type: z.string(),
  ttl: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().optional(),
  routing_policy: z.string().optional(),
  proxy_status: z.string().optional(),
})

export const organizationSendingDomainSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  domain_name: z.string().min(1),
  resend_domain_id: z.string().min(1),
  status: sendingDomainStatusSchema,
  region: sendingDomainRegionSchema,
  dns_records: z.array(sendingDomainDnsRecordSchema),
  verified_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const createSendingDomainInputSchema = z.object({
  domain_name: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(253)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
      "Enter a valid domain (e.g. mail.yourdomain.com)"
    ),
  region: sendingDomainRegionSchema.default("eu-west-1"),
})

export type SendingDomainStatus = z.infer<typeof sendingDomainStatusSchema>
export type SendingDomainRegion = z.infer<typeof sendingDomainRegionSchema>
export type SendingDomainDnsRecord = z.infer<typeof sendingDomainDnsRecordSchema>
export type OrganizationSendingDomain = z.infer<typeof organizationSendingDomainSchema>
export type CreateSendingDomainInput = z.infer<typeof createSendingDomainInputSchema>
