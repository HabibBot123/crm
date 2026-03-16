-- Add unassigned_coaching_count to dashboard_overview for CTA "coachings to assign"
CREATE OR REPLACE FUNCTION public.dashboard_overview(p_organization_id bigint)
 RETURNS TABLE(
   organization_id bigint,
   total_products integer,
   total_published_products integer,
   total_offers integer,
   total_enrollments integer,
   active_enrollments integer,
   total_revenue numeric,
   revenue_last_30_days numeric,
   total_clients integer,
   active_students integer,
   recent_sales jsonb,
   top_products jsonb,
   unassigned_coaching_count integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p_organization_id AS organization_id,

    COALESCE((
      SELECT count(*) FROM public.products pr
      WHERE pr.organization_id = p_organization_id
    ), 0) AS total_products,

    COALESCE((
      SELECT count(*) FROM public.products pr
      WHERE pr.organization_id = p_organization_id AND pr.status = 'published'
    ), 0) AS total_published_products,

    COALESCE((
      SELECT count(*) FROM public.offers o
      WHERE o.organization_id = p_organization_id
    ), 0) AS total_offers,

    COALESCE((
      SELECT count(*) FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
    ), 0) AS total_enrollments,

    COALESCE((
      SELECT count(*) FROM public.enrollments e
      WHERE e.organization_id = p_organization_id AND e.status = 'active'
    ), 0) AS active_enrollments,

    COALESCE((
      SELECT sum(s.price) FROM public.sales s
      WHERE s.organization_id = p_organization_id
    ), 0)::numeric AS total_revenue,

    COALESCE((
      SELECT sum(s.price) FROM public.sales s
      WHERE s.organization_id = p_organization_id
        AND s.created_at >= (now() - interval '30 days')
    ), 0)::numeric AS revenue_last_30_days,

    COALESCE((
      SELECT count(DISTINCT COALESCE(e.user_id::text, e.buyer_email))
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
    ), 0) AS total_clients,

    COALESCE((
      SELECT count(DISTINCT COALESCE(e.user_id::text, e.buyer_email))
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id AND e.status = 'active'
    ), 0) AS active_students,

    COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT s.id, s.created_at, s.price AS amount, s.currency, s.buyer_email,
               u.full_name AS user_full_name, o.title AS offer_title
        FROM public.sales s
        LEFT JOIN public.enrollments e ON e.id = s.enrollment_id
        LEFT JOIN public.users u ON u.id = s.user_id
        LEFT JOIN public.offers o ON o.id = e.offer_id
        WHERE s.organization_id = p_organization_id
        ORDER BY s.created_at DESC
        LIMIT 5
      ) AS t
    ), '[]'::jsonb) AS recent_sales,

    COALESCE((
      SELECT jsonb_agg(row_to_json(tp) ORDER BY tp.total_enrollments DESC)
      FROM (
        SELECT p.id AS product_id, p.title, p.type,
               count(DISTINCT ep.enrollment_id) AS total_enrollments
        FROM public.products p
        JOIN public.enrollment_products ep ON ep.product_id = p.id
        JOIN public.enrollments e ON e.id = ep.enrollment_id
        WHERE p.organization_id = p_organization_id
        GROUP BY p.id, p.title, p.type
        ORDER BY total_enrollments DESC
        LIMIT 5
      ) AS tp
    ), '[]'::jsonb) AS top_products,

    COALESCE((
      SELECT count(*)::integer
      FROM public.enrollment_products ep
      JOIN public.enrollments e ON e.id = ep.enrollment_id
      JOIN public.products p ON p.id = ep.product_id
      WHERE e.organization_id = p_organization_id
        AND p.type = 'coaching'
        AND NOT EXISTS (
          SELECT 1 FROM public.coaching_assignments ca
          WHERE ca.enrollment_product_id = ep.id
        )
    ), 0) AS unassigned_coaching_count;
$function$;
