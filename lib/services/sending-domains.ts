import type { SupabaseClient } from "@supabase/supabase-js"
import {
  organizationSendingDomainSchema,
  sendingDomainDnsRecordSchema,
  sendingDomainStatusSchema,
  type OrganizationSendingDomain,
  type SendingDomainDnsRecord,
  type SendingDomainStatus,
} from "@/schemas/sending-domain.schema"

function parseDnsRecords(value: unknown): SendingDomainDnsRecord[] {
  const parsed = sendingDomainDnsRecordSchema.array().safeParse(value)
  if (!parsed.success) return []
  return parsed.data
}

function mapRow(row: Record<string, unknown>): OrganizationSendingDomain {
  return organizationSendingDomainSchema.parse({
    ...row,
    dns_records: parseDnsRecords(row.dns_records),
  })
}

export async function fetchSendingDomain(
  supabase: SupabaseClient,
  organizationId: number
): Promise<OrganizationSendingDomain | null> {
  const { data, error } = await supabase
    .from("organization_sending_domains")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapRow(data)
}

export async function insertSendingDomain(
  supabase: SupabaseClient,
  input: {
    organization_id: number
    domain_name: string
    resend_domain_id: string
    status: SendingDomainStatus
    region: OrganizationSendingDomain["region"]
    dns_records: SendingDomainDnsRecord[]
  }
): Promise<OrganizationSendingDomain> {
  const { data, error } = await supabase
    .from("organization_sending_domains")
    .insert({
      organization_id: input.organization_id,
      domain_name: input.domain_name,
      resend_domain_id: input.resend_domain_id,
      status: input.status,
      region: input.region,
      dns_records: input.dns_records,
      verified_at: input.status === "verified" ? new Date().toISOString() : null,
    })
    .select("*")
    .single()

  if (error) throw error
  return mapRow(data)
}

export async function updateSendingDomainFromResend(
  supabase: SupabaseClient,
  organizationId: number,
  input: {
    status: SendingDomainStatus
    dns_records: SendingDomainDnsRecord[]
  }
): Promise<OrganizationSendingDomain> {
  const status = sendingDomainStatusSchema.parse(input.status)
  const verifiedAt = status === "verified" ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from("organization_sending_domains")
    .update({
      status,
      dns_records: input.dns_records,
      verified_at: verifiedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .select("*")
    .single()

  if (error) throw error
  return mapRow(data)
}

export async function deleteSendingDomain(
  supabase: SupabaseClient,
  organizationId: number
): Promise<void> {
  const { error } = await supabase
    .from("organization_sending_domains")
    .delete()
    .eq("organization_id", organizationId)

  if (error) throw error
}

export function normalizeDomainName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, "")
}

export function parseResendDomainStatus(value: string): SendingDomainStatus {
  const parsed = sendingDomainStatusSchema.safeParse(value)
  if (parsed.success) return parsed.data
  return "pending"
}

export function parseResendDnsRecords(records: unknown): SendingDomainDnsRecord[] {
  return parseDnsRecords(records)
}
