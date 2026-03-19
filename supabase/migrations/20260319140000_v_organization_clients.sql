-- One row per client per organization (aggregated from enrollments + users + organization_sales).
-- Used by the API with admin client so users table can be read; not exposed to RLS client.
CREATE OR REPLACE VIEW public.v_organization_clients AS
SELECT
  e.organization_id,
  COALESCE(e.user_id::text, e.buyer_email, '') AS client_key,
  e.user_id,
  e.buyer_email,
  MAX(COALESCE(u.full_name, e.buyer_email, '—'))::text AS client_display,
  MAX(COALESCE(u.email, e.buyer_email))::text AS client_email,
  (COALESCE(SUM(os.price), 0) * 100)::bigint AS total_spent,
  COUNT(*)::int AS enrollment_count,
  MIN(e.started_at) AS first_enrollment_started_at,
  MAX(e.expires_at) AS last_enrollment_expires_at,
  (CASE
    WHEN BOOL_OR(e.status = 'active') THEN 'active'
    WHEN BOOL_AND(e.status = 'cancelled') THEN 'cancelled'
    WHEN BOOL_AND(e.status = 'expired') THEN 'expired'
    ELSE 'paused'
  END)::text AS status
FROM public.enrollments e
LEFT JOIN public.users u ON u.id = e.user_id
LEFT JOIN public.organization_sales os ON os.enrollment_id = e.id AND os.organization_id = e.organization_id
GROUP BY e.organization_id, e.user_id, e.buyer_email;
