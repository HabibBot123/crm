import type { SupabaseClient } from "@supabase/supabase-js"
import {
  clientSummarySchema,
  type ClientSummary,
} from "@/schemas/clients.schema"

export type { ClientSummary }

export type ClientsPage = {
  items: ClientSummary[]
  total: number
}

export type FetchClientsPageParams = {
  supabase: SupabaseClient
  organizationId: number
  page: number
  pageSize: number
  search?: string
  statuses?: Array<"active" | "expired">
  /** Total spent in cents. */
  totalSpentMinCents?: number
  /** Total spent in cents. */
  totalSpentMaxCents?: number
  /** YYYY-MM-DD */
  firstJoinedFrom?: string
  /** YYYY-MM-DD */
  firstJoinedTo?: string
}

export type FetchClientDetailParams = {
  supabase: SupabaseClient
  organizationId: number
  clientKey: string
}

/** One row from the organization_client_enrollments view (one enrollment per row). */
export type ClientEnrollmentRow = {
  organization_id: number
  enrollment_id: number
  offer_id: number
  offer_title: string
  user_id: string | null
  client_name: string | null
  client_email: string | null
  client_display: string
  enrollment_status: "active" | "expired" | "cancelled" | "paused"
  enrollment_started_at: string
  enrollment_expires_at: string | null
  enrollment_created_at: string
  enrollment_updated_at: string
  total_spent: number
}

/** Client aggregated from view rows (one per client, with all their enrollments). */
export type ClientWithEnrollments = {
  clientKey: string
  user_id: string | null
  client_display: string
  client_email: string | null
  email_display: string
  email_for_mailto: string | null
  has_account: boolean
  total_spent: number
  enrollments: {
    enrollment_id: number
    offer_id: number
    offer_title: string
    enrollment_status: ClientEnrollmentRow["enrollment_status"]
    enrollment_started_at: string
    enrollment_expires_at: string | null
    enrollment_created_at: string
  }[]
  status: "active" | "expired" | "cancelled" | "paused"
}

export function groupClientEnrollmentRows(
  rows: ClientEnrollmentRow[]
): ClientWithEnrollments[] {
  const byKey = new Map<string, ClientWithEnrollments>()

  for (const row of rows) {
    const key = row.user_id ?? row.client_email ?? String(row.enrollment_id)
    const existing = byKey.get(key)

    const enrollment = {
      enrollment_id: row.enrollment_id,
      offer_id: row.offer_id,
      offer_title: row.offer_title,
      enrollment_status: row.enrollment_status,
      enrollment_started_at: row.enrollment_started_at,
      enrollment_expires_at: row.enrollment_expires_at,
      enrollment_created_at: row.enrollment_created_at,
    }

    if (!existing) {
      byKey.set(key, {
        clientKey: key,
        user_id: row.user_id,
        client_display: row.client_display,
        client_email: row.client_email,
        email_display: row.client_email ?? "—",
        email_for_mailto: row.client_email,
        has_account: row.user_id != null,
        total_spent: Number(row.total_spent),
        enrollments: [enrollment],
        status: deriveClientStatus([row.enrollment_status]),
      })
    } else {
      existing.enrollments.push(enrollment)
      existing.total_spent += Number(row.total_spent)
      existing.status = deriveClientStatus(
        existing.enrollments.map((e) => e.enrollment_status)
      )
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    (b.enrollments[0]?.enrollment_started_at ?? "").localeCompare(
      a.enrollments[0]?.enrollment_started_at ?? ""
    )
  )
}

/** Exact email match on the clients list view (for sheet deep-links). */
export async function findClientByEmail(
  supabase: SupabaseClient,
  organizationId: number,
  email: string
): Promise<ClientSummary | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const { data, error } = await supabase
    .from("v_organization_clients")
    .select("*")
    .eq("organization_id", organizationId)
    .ilike("client_email", normalized)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return clientSummarySchema.parse(data)
}

export async function fetchClientsPage(
  params: FetchClientsPageParams
): Promise<ClientsPage> {
  const {
    supabase,
    organizationId,
    page,
    pageSize,
    search,
    statuses,
    totalSpentMinCents,
    totalSpentMaxCents,
    firstJoinedFrom,
    firstJoinedTo,
  } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("v_organization_clients")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("first_enrollment_started_at", { ascending: false })
    .range(from, to)

  const term = search?.trim()
  if (term) {
    const q = term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''")
    query = query.or(`client_display.ilike.%${q}%,client_email.ilike.%${q}%`)
  }
  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses)
  }
  if (totalSpentMinCents != null) {
    query = query.gte("total_spent", totalSpentMinCents)
  }
  if (totalSpentMaxCents != null) {
    query = query.lte("total_spent", totalSpentMaxCents)
  }
  if (firstJoinedFrom) {
    query = query.gte("first_enrollment_started_at", `${firstJoinedFrom}T00:00:00.000Z`)
  }
  if (firstJoinedTo) {
    query = query.lte("first_enrollment_started_at", `${firstJoinedTo}T23:59:59.999Z`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    items: (data ?? []) as ClientSummary[],
    total: count ?? 0,
  }
}

type EnrollmentJoinRow = {
  id: number
  organization_id: number
  offer_id: number
  user_id: string | null
  buyer_email: string | null
  status: string
  started_at: string
  expires_at: string | null
  created_at: string
  updated_at: string
  offers: { title: string } | { title: string }[] | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

export async function fetchClientDetail(
  params: FetchClientDetailParams
): Promise<ClientWithEnrollments | null> {
  const { supabase, organizationId, clientKey } = params
  const key = clientKey.trim()

  let q = supabase
    .from("enrollments")
    .select(
      "id, organization_id, offer_id, user_id, buyer_email, status, started_at, expires_at, created_at, updated_at, offers(title), profiles(full_name)"
    )
    .eq("organization_id", organizationId)
    .order("started_at", { ascending: false })

  q = key.includes("@") ? q.eq("buyer_email", key) : q.eq("user_id", key)

  const { data, error } = await q
  if (error) throw error

  const enrollments = (data ?? []) as EnrollmentJoinRow[]
  if (enrollments.length === 0) return null

  const rows: ClientEnrollmentRow[] = enrollments.map((e) => {
    const offer = Array.isArray(e.offers) ? e.offers[0] : e.offers
    const prof = e.profiles
    const p = Array.isArray(prof) ? prof[0] : prof
    const fullName = p?.full_name ?? null
    return {
      organization_id: e.organization_id,
      enrollment_id: e.id,
      offer_id: e.offer_id,
      offer_title: offer?.title ?? "",
      user_id: e.user_id,
      client_name: fullName,
      client_email: e.buyer_email,
      client_display: fullName ?? e.buyer_email ?? "—",
      enrollment_status: e.status as ClientEnrollmentRow["enrollment_status"],
      enrollment_started_at: e.started_at,
      enrollment_expires_at: e.expires_at,
      enrollment_created_at: e.created_at,
      enrollment_updated_at: e.updated_at,
      total_spent: 0,
    }
  })

  return groupClientEnrollmentRows(rows)[0] ?? null
}

function deriveClientStatus(
  statuses: ClientEnrollmentRow["enrollment_status"][]
): ClientWithEnrollments["status"] {
  if (statuses.some((s) => s === "active")) return "active"
  if (statuses.every((s) => s === "cancelled")) return "cancelled"
  if (statuses.every((s) => s === "expired")) return "expired"
  return "paused"
}
