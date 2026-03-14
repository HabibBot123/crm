-- Remove offer_id from sales; offer is always available via enrollment_id -> enrollments.offer_id

ALTER TABLE public.sales DROP COLUMN IF EXISTS offer_id;

-- Update dashboard_overview so recent_sales gets offer_title via enrollment
CREATE OR REPLACE FUNCTION public.dashboard_overview(p_organization_id bigint)
 RETURNS TABLE(organization_id bigint, total_products integer, total_published_products integer, total_offers integer, total_enrollments integer, active_enrollments integer, total_revenue numeric, revenue_last_30_days numeric, total_clients integer, active_students integer, recent_sales jsonb, top_products jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p_organization_id AS organization_id,

    -- Products
    COALESCE((
      SELECT count(*)
      FROM public.products pr
      WHERE pr.organization_id = p_organization_id
    ), 0) AS total_products,

    COALESCE((
      SELECT count(*)
      FROM public.products pr
      WHERE pr.organization_id = p_organization_id
        AND pr.status = 'published'
    ), 0) AS total_published_products,

    -- Offers
    COALESCE((
      SELECT count(*)
      FROM public.offers o
      WHERE o.organization_id = p_organization_id
    ), 0) AS total_offers,

    -- Enrollments
    COALESCE((
      SELECT count(*)
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
    ), 0) AS total_enrollments,

    COALESCE((
      SELECT count(*)
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
        AND e.status = 'active'
    ), 0) AS active_enrollments,

    -- Revenue (all time) from sales table
    COALESCE((
      SELECT sum(s.price)
      FROM public.sales s
      WHERE s.organization_id = p_organization_id
    ), 0)::numeric AS total_revenue,

    -- Revenue last 30 days
    COALESCE((
      SELECT sum(s.price)
      FROM public.sales s
      WHERE s.organization_id = p_organization_id
        AND s.created_at >= (now() - interval '30 days')
    ), 0)::numeric AS revenue_last_30_days,

    -- Distinct clients (by user_id OR buyer_email) based on enrollments
    COALESCE((
      SELECT count(DISTINCT COALESCE(e.user_id::text, e.buyer_email))
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
    ), 0) AS total_clients,

    -- Active students (distinct users with active enrollments, user_id or buyer_email)
    COALESCE((
      SELECT count(DISTINCT COALESCE(e.user_id::text, e.buyer_email))
      FROM public.enrollments e
      WHERE e.organization_id = p_organization_id
        AND e.status = 'active'
    ), 0) AS active_students,

    -- Recent sales (last 5): offer_title via enrollment -> offers
    COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          s.id,
          s.created_at,
          s.price   AS amount,
          s.currency,
          s.buyer_email,
          u.full_name AS user_full_name,
          o.title AS offer_title
        FROM public.sales s
        LEFT JOIN public.enrollments e ON e.id = s.enrollment_id
        LEFT JOIN public.users u ON u.id = s.user_id
        LEFT JOIN public.offers o ON o.id = e.offer_id
        WHERE s.organization_id = p_organization_id
        ORDER BY s.created_at DESC
        LIMIT 5
      ) AS t
    ), '[]'::jsonb) AS recent_sales,

    -- Top products (by enrollments) as JSON array
    COALESCE((
      SELECT jsonb_agg(row_to_json(tp) ORDER BY tp.total_enrollments DESC)
      FROM (
        SELECT
          p.id   AS product_id,
          p.title,
          p.type,
          count(DISTINCT ep.enrollment_id) AS total_enrollments
        FROM public.products p
        JOIN public.enrollment_products ep
          ON ep.product_id = p.id
        JOIN public.enrollments e
          ON e.id = ep.enrollment_id
        WHERE p.organization_id = p_organization_id
        GROUP BY p.id, p.title, p.type
        ORDER BY total_enrollments DESC
        LIMIT 5
      ) AS tp
    ), '[]'::jsonb) AS top_products;
$function$;
