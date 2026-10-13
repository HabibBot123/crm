import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import {
  buOwnerSettlementOwnerSummarySchema,
  buOwnerSettlementSchema,
  type BuOwnerSettlement,
  type BuOwnerSettlementOwnerSummary,
  type BuOwnerSettlementStatus,
} from "@/schemas/bu-owner-settlements.schema"

export type BuOwnerSettlementListFilters = {
  search?: string
  statuses?: BuOwnerSettlementStatus[]
  overdueOnly?: boolean
  amountMinCents?: number
  amountMaxCents?: number
  dueFrom?: string
  dueTo?: string
  businessUnitId?: number | null
  page?: number
  pageSize?: number
}

export type BuOwnerSettlementListResult = {
  items: BuOwnerSettlement[]
  total: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return Object.fromEntries(Object.entries(value))
}

function readNumber(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null
  const value = record[key]
  return typeof value === "string" ? value : null
}

function isSettlementOverdue(row: BuOwnerSettlement, nowMs: number): boolean {
  return row.status === "pending" && new Date(row.due_at).getTime() < nowMs
}

function dueDay(value: string): string {
  return value.slice(0, 10)
}

async function enrichSettlements(
  supabase: SupabaseClient,
  rows: BuOwnerSettlement[]
): Promise<BuOwnerSettlement[]> {
  if (rows.length === 0) return []

  const buIds = Array.from(new Set(rows.map((row) => row.business_unit_id)))
  const ownerIds = Array.from(new Set(rows.map((row) => row.owner_member_id)))

  const buNameById = new Map<number, string>()
  if (buIds.length > 0) {
    const { data: units, error: unitsError } = await supabase
      .from("business_units")
      .select("id, name")
      .in("id", buIds)
    if (unitsError) throw unitsError
    for (const unit of units ?? []) {
      const record = asRecord(unit)
      const id = readNumber(record, "id")
      const name = readString(record, "name")
      if (id != null && name != null) buNameById.set(id, name)
    }
  }

  const ownerNameById = new Map<number, string | null>()
  if (ownerIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, email, profiles(full_name)")
      .in("id", ownerIds)
    if (membersError) throw membersError
    for (const member of members ?? []) {
      const record = asRecord(member)
      const id = readNumber(record, "id")
      if (id == null) continue
      const profiles = record?.profiles
      const profile = Array.isArray(profiles) ? profiles[0] : profiles
      const fullName = readString(asRecord(profile), "full_name")
      ownerNameById.set(id, fullName ?? readString(record, "email"))
    }
  }

  return rows.map((row) =>
    buOwnerSettlementSchema.parse({
      ...row,
      business_unit_name: buNameById.get(row.business_unit_id) ?? null,
      owner_name: ownerNameById.get(row.owner_member_id) ?? null,
    })
  )
}

function applyListFilters(
  rows: BuOwnerSettlement[],
  options?: BuOwnerSettlementListFilters
): BuOwnerSettlement[] {
  if (!options) return rows

  const nowMs = Date.now()
  const search = options.search?.trim().toLowerCase() ?? ""
  const statusSet =
    options.statuses && options.statuses.length > 0
      ? new Set(options.statuses)
      : null

  return rows.filter((row) => {
    if (statusSet && !statusSet.has(row.status)) return false

    if (options.overdueOnly === true && !isSettlementOverdue(row, nowMs)) {
      return false
    }

    if (
      options.amountMinCents != null &&
      row.amount_cents < options.amountMinCents
    ) {
      return false
    }
    if (
      options.amountMaxCents != null &&
      row.amount_cents > options.amountMaxCents
    ) {
      return false
    }

    const due = dueDay(row.due_at)
    if (options.dueFrom != null && due < options.dueFrom) return false
    if (options.dueTo != null && due > options.dueTo) return false

    if (search.length > 0) {
      const haystack = [
        row.owner_name,
        row.business_unit_name,
        String(row.owner_member_id),
        String(row.business_unit_id),
        row.period_start,
        row.period_end,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }

    return true
  })
}

async function fetchFilteredBuOwnerSettlements(
  supabase: SupabaseClient,
  organizationId: number,
  options?: BuOwnerSettlementListFilters
): Promise<BuOwnerSettlement[]> {
  let query = supabase
    .from("bu_owner_settlements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: false })

  if (options?.businessUnitId != null) {
    query = query.eq("business_unit_id", options.businessUnitId)
  }
  if (options?.statuses && options.statuses.length === 1) {
    query = query.eq("status", options.statuses[0])
  } else if (options?.statuses && options.statuses.length > 1) {
    query = query.in("status", options.statuses)
  }
  if (options?.amountMinCents != null) {
    query = query.gte("amount_cents", options.amountMinCents)
  }
  if (options?.amountMaxCents != null) {
    query = query.lte("amount_cents", options.amountMaxCents)
  }
  if (options?.dueFrom) {
    query = query.gte("due_at", `${options.dueFrom}T00:00:00.000Z`)
  }
  if (options?.dueTo) {
    query = query.lte("due_at", `${options.dueTo}T23:59:59.999Z`)
  }
  if (options?.overdueOnly === true) {
    query = query.eq("status", "pending").lt("due_at", new Date().toISOString())
  }

  const { data, error } = await query
  if (error) throw error

  const parsed = z.array(buOwnerSettlementSchema).parse(data ?? [])
  const enriched = await enrichSettlements(supabase, parsed)
  return applyListFilters(enriched, options)
}

export async function fetchBuOwnerSettlements(
  supabase: SupabaseClient,
  organizationId: number,
  options?: BuOwnerSettlementListFilters
): Promise<BuOwnerSettlementListResult> {
  const rows = await fetchFilteredBuOwnerSettlements(
    supabase,
    organizationId,
    options
  )
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 25))
  const page = Math.max(1, options?.page ?? 1)
  const from = (page - 1) * pageSize
  return {
    items: rows.slice(from, from + pageSize),
    total: rows.length,
  }
}

export async function fetchBuOwnerSettlementsSummaryByOwner(
  supabase: SupabaseClient,
  organizationId: number,
  options?: BuOwnerSettlementListFilters
): Promise<BuOwnerSettlementOwnerSummary[]> {
  const rows = await fetchFilteredBuOwnerSettlements(
    supabase,
    organizationId,
    options
  )
  const nowMs = Date.now()
  const byOwner = new Map<number, BuOwnerSettlementOwnerSummary>()

  for (const row of rows) {
    if (row.status !== "pending") continue
    const existing = byOwner.get(row.owner_member_id)
    const summary =
      existing ??
      buOwnerSettlementOwnerSummarySchema.parse({
        owner_member_id: row.owner_member_id,
        owner_name: row.owner_name,
        pending_count: 0,
        pending_cents: 0,
        overdue_count: 0,
        overdue_cents: 0,
        pending_ids: [],
        overdue_ids: [],
      })

    summary.pending_count += 1
    summary.pending_cents += row.amount_cents
    summary.pending_ids.push(row.id)
    if (isSettlementOverdue(row, nowMs)) {
      summary.overdue_count += 1
      summary.overdue_cents += row.amount_cents
      summary.overdue_ids.push(row.id)
    }
    if (row.owner_name != null) summary.owner_name = row.owner_name
    if (!existing) byOwner.set(row.owner_member_id, summary)
  }

  return Array.from(byOwner.values()).sort(
    (a, b) =>
      b.pending_cents - a.pending_cents ||
      (a.owner_name ?? "").localeCompare(b.owner_name ?? "")
  )
}

export async function markBuOwnerSettlementsPaid(
  supabase: SupabaseClient,
  organizationId: number,
  settlementIds: number[],
  paidByMemberId: number
): Promise<number> {
  if (settlementIds.length === 0) return 0
  const { data, error } = await supabase
    .from("bu_owner_settlements")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_by: paidByMemberId,
    })
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .in("id", settlementIds)
    .select("id")
  if (error) throw error
  return data?.length ?? 0
}

export async function markBuOwnerSettlementsUnpaid(
  supabase: SupabaseClient,
  organizationId: number,
  settlementIds: number[]
): Promise<number> {
  if (settlementIds.length === 0) return 0
  const { data, error } = await supabase
    .from("bu_owner_settlements")
    .update({
      status: "pending",
      paid_at: null,
      paid_by: null,
    })
    .eq("organization_id", organizationId)
    .eq("status", "paid")
    .in("id", settlementIds)
    .select("id")
  if (error) throw error
  return data?.length ?? 0
}

export async function runBuOwnerSettlementMonth(
  supabase: SupabaseClient,
  year: number,
  month: number,
  organizationId?: number | null
): Promise<number> {
  const { data, error } = await supabase.rpc("settle_bu_owner_month", {
    p_year: year,
    p_month: month,
    p_organization_id: organizationId ?? null,
  })
  if (error) throw error
  return typeof data === "number" && Number.isFinite(data) ? data : 0
}
