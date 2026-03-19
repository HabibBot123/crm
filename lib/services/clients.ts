import type { SupabaseClient } from "@supabase/supabase-js"

/** One row from v_organization_clients (list endpoint). */
export type ClientSummary = {
  organization_id: number
  client_key: string
  user_id: string | null
  buyer_email: string | null
  client_display: string
  client_email: string | null
  total_spent: number
  enrollment_count: number
  first_enrollment_started_at: string | null
  last_enrollment_expires_at: string | null
  status: "active" | "expired" | "cancelled" | "paused"
}

export type ClientsPage = {
  items: ClientSummary[]
  total: number
}

export type FetchClientsPageParams = {
  organizationId: number
  page: number
  pageSize: number
  search?: string
}

export type FetchClientDetailParams = {
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
  buyer_email: string | null
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
  /** Stable key: user_id when set, else buyer_email. */
  clientKey: string
  user_id: string | null
  buyer_email: string | null
  client_display: string
  client_email: string | null
  email_display: string
  /** Email for mailto (null when neither client_email nor buyer_email). */
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
  /** Derived: "active" if any enrollment active, "expired" if all expired, "cancelled" if all cancelled, else "paused". */
  status: "active" | "expired" | "cancelled" | "paused"
}

export async function fetchClientEnrollmentsByOrganization(
  supabase: SupabaseClient,
  organizationId: number
): Promise<ClientEnrollmentRow[]> {
  const { data, error } = await supabase
    .from("organization_client_enrollments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("enrollment_started_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientEnrollmentRow[]
}

/** Group view rows by client (user_id or buyer_email) and derive status. */
export function groupClientEnrollmentRows(
  rows: ClientEnrollmentRow[]
): ClientWithEnrollments[] {
  const byKey = new Map<string, ClientWithEnrollments>()

  for (const row of rows) {
    const key =
      row.user_id ?? row.buyer_email ?? `unknown-${row.enrollment_id}`
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
      const status = deriveClientStatus([row.enrollment_status])
      byKey.set(key, {
        clientKey: key,
        user_id: row.user_id,
        buyer_email: row.buyer_email,
        client_display: row.client_display,
        client_email: row.client_email,
        email_display: row.client_email ?? row.buyer_email ?? "—",
        email_for_mailto: row.client_email ?? row.buyer_email ?? null,
        has_account: row.user_id != null,
        total_spent: Number(row.total_spent),
        enrollments: [enrollment],
        status,
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

/** Fetch view rows and return grouped clients. Single entry point for the clients page. */
export async function fetchClientsByOrganization(
  supabase: SupabaseClient,
  organizationId: number
): Promise<ClientWithEnrollments[]> {
  const rows = await fetchClientEnrollmentsByOrganization(
    supabase,
    organizationId
  )
  return groupClientEnrollmentRows(rows)
}

/** Fetch paginated clients list via API (uses v_organization_clients in API with admin). */
export async function fetchClientsPage(
  params: FetchClientsPageParams
): Promise<ClientsPage> {
  const { organizationId, page, pageSize, search } = params
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (search?.trim()) searchParams.set("search", search.trim())

  const res = await fetch(
    `/api/organizations/${organizationId}/clients?${searchParams.toString()}`,
    { method: "GET" }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Failed to load clients"
    throw new Error(message)
  }

  return res.json() as Promise<ClientsPage>
}

/** Fetch one client's detail (enrollments) via API. */
export async function fetchClientDetail(
  params: FetchClientDetailParams
): Promise<ClientWithEnrollments | null> {
  const { organizationId, clientKey } = params
  const searchParams = new URLSearchParams({ clientKey })

  const res = await fetch(
    `/api/organizations/${organizationId}/clients?${searchParams.toString()}`,
    { method: "GET" }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Failed to load client detail"
    throw new Error(message)
  }

  const data = (await res.json()) as { client: ClientWithEnrollments | null }
  return data.client
}

function deriveClientStatus(
  statuses: ClientEnrollmentRow["enrollment_status"][]
): ClientWithEnrollments["status"] {
  if (statuses.some((s) => s === "active")) return "active"
  if (statuses.every((s) => s === "cancelled")) return "cancelled"
  if (statuses.every((s) => s === "expired")) return "expired"
  return "paused"
}
