import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import { findClientByEmail } from "@/lib/services/clients"
import type { ClientSummary } from "@/schemas/clients.schema"
import { fetchCommissions } from "@/lib/services/commissions"
import { fetchLeadDetail } from "@/lib/services/crm"
import type { Commission, Lead } from "@/schemas/crm.schema"
import {
  saleListRowSchema,
  type OrganizationSaleListItem,
  type OrganizationSalesFilters,
} from "@/schemas/sales.schema"

export type { OrganizationSaleListItem, OrganizationSalesFilters }

export async function fetchOrganizationSales(
  supabase: SupabaseClient,
  organizationId: number,
  options: OrganizationSalesFilters
): Promise<{ items: OrganizationSaleListItem[]; total: number }> {
  const page = Math.max(1, options.page)
  const pageSize = Math.max(1, Math.min(100, options.pageSize))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const search = options.search?.trim() ?? ""

  let query = supabase
    .from("v_organization_sales")
    .select(
      `
      id, organization_id, enrollment_id, buyer_email, billing_type, price, currency, source, created_at, sold_at,
      base_amount_cents, installment_index, installment_count,
      offer_title, lead_id, lead_name, commissions_activated_at,
      commissions_total_cents, commissions_pending_cents,
      offer_id, payment_kind
    `,
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("sold_at", { ascending: false })
    .range(from, to)

  if (search.length > 0) {
    const pattern = `%${search}%`
    query = query.or(
      `buyer_email.ilike.${pattern},lead_name.ilike.${pattern},offer_title.ilike.${pattern}`
    )
  }
  if (options.paymentKinds && options.paymentKinds.length > 0) {
    query = query.in("payment_kind", options.paymentKinds)
  }
  if (options.sources && options.sources.length > 0) {
    query = query.in("source", options.sources)
  }
  if (options.offerIds && options.offerIds.length > 0) {
    query = query.in("offer_id", options.offerIds)
  }
  if (options.amountMinCents != null) {
    query = query.gte("price", options.amountMinCents)
  }
  if (options.amountMaxCents != null) {
    query = query.lte("price", options.amountMaxCents)
  }

  const { data, error, count } = await query
  if (error) throw error

  const sales = z.array(saleListRowSchema).parse(data ?? [])

  const items: OrganizationSaleListItem[] = sales.map((sale) => ({
    id: sale.id,
    organization_id: sale.organization_id,
    enrollment_id: sale.enrollment_id,
    buyer_email: sale.buyer_email,
    billing_type: sale.billing_type,
    price_cents: sale.price,
    currency: sale.currency,
    source: sale.source,
    created_at: sale.created_at,
    sold_at: sale.sold_at,
    base_amount_cents: sale.base_amount_cents ?? null,
    installment_index: sale.installment_index ?? null,
    installment_count: sale.installment_count ?? null,
    offer_title: sale.offer_title ?? null,
    lead_id: sale.lead_id ?? null,
    lead_name: sale.lead_name ?? null,
    commissions_activated_at: sale.commissions_activated_at ?? null,
    commissions_total_cents: sale.commissions_total_cents ?? 0,
    commissions_pending_cents: sale.commissions_pending_cents ?? 0,
    offer_id: sale.offer_id ?? null,
    payment_kind: sale.payment_kind,
  }))

  return { items, total: count ?? 0 }
}

export type SaleSheetRelated = {
  client: ClientSummary | null
  lead: Lead | null
  commissions: Commission[]
}

/** Related entities for the sale detail sheet (client / lead / commissions). */
export async function fetchSaleSheetRelated(
  supabase: SupabaseClient,
  organizationId: number,
  sale: OrganizationSaleListItem
): Promise<SaleSheetRelated> {
  const email = sale.buyer_email?.trim() ?? ""

  const [client, lead, commissionsPage] = await Promise.all([
    email.length > 0
      ? findClientByEmail(supabase, organizationId, email)
      : Promise.resolve(null),
    sale.lead_id != null
      ? fetchLeadDetail(supabase, sale.lead_id)
      : Promise.resolve(null),
    fetchCommissions(supabase, organizationId, {
      organizationSaleId: sale.id,
      page: 1,
      pageSize: 50,
    }),
  ])

  return {
    client,
    lead,
    commissions: commissionsPage.items,
  }
}
