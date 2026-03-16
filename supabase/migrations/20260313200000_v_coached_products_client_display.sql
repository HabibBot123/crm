drop view public.v_coached_products;
-- Add user_full_name, user_mail, coach_assigned, session progression (completion_total/completion_completed for coaching)
CREATE OR REPLACE VIEW public.v_coached_products AS
SELECT
  e.user_id,
  COALESCE(u.full_name, e.buyer_email, '—') AS user_full_name,
  COALESCE(u.email, e.buyer_email, '') AS user_mail,
  e.organization_id,
  org.name AS organization_name,
  org.slug AS organization_slug,
  e.id AS enrollment_id,
  ep.id AS enrollment_product_id,
  e.offer_id,
  o.billing_type AS offer_billing_type,
  o."interval" AS offer_interval,
  o.title AS offer_title,
  o.price AS offer_price,
  o.currency AS offer_currency,
  e.status AS enrollment_status,
  e.started_at,
  e.expires_at,
  p.id AS product_id,
  p.title AS product_title,
  p.type AS product_type,
  p.cover_image_url,
  u_coach.full_name AS coach_full_name,
  CASE
    WHEN p.type = 'course'::text THEN (
      SELECT count(*)::integer
      FROM product_module_items pmi
      JOIN product_modules pm ON pm.id = pmi.product_module_id
      WHERE pm.product_id = p.id
    )
    WHEN p.type = 'coaching'::text THEN (
      SELECT pc.sessions_count::integer
      FROM product_coaching pc
      WHERE pc.product_id = p.id
      LIMIT 1
    )
    ELSE NULL::integer
  END AS completion_total,
  CASE
    WHEN p.type = 'course'::text THEN (
      SELECT count(*)::integer
      FROM course_lesson_progress clp
      JOIN product_module_items pmi ON pmi.id = clp.product_module_item_id
      JOIN product_modules pm ON pm.id = pmi.product_module_id
      WHERE pm.product_id = p.id
        AND clp.user_id = e.user_id
        AND clp.enrollment_product_id = ep.id
        AND clp.completed_at IS NOT NULL
    )
    WHEN p.type = 'coaching'::text THEN (
      SELECT count(*)::integer
      FROM coaching_sessions cs
      WHERE cs.enrollment_product_id = ep.id
        AND cs.completed_at IS NOT NULL
    )
    ELSE NULL::integer
  END AS completion_completed
FROM enrollments e
JOIN offers o ON o.id = e.offer_id
JOIN enrollment_products ep ON ep.enrollment_id = e.id
JOIN products p ON p.id = ep.product_id
JOIN organizations org ON org.id = e.organization_id
LEFT JOIN public.users u ON u.id = e.user_id
LEFT JOIN coaching_assignments ca ON ca.enrollment_product_id = ep.id
LEFT JOIN organization_members om_coach ON om_coach.id = ca.organization_member_id
LEFT JOIN public.users u_coach ON u_coach.id = om_coach.user_id
WHERE e.status IN ('active', 'paused')
  AND org.deleted_at IS NULL;
