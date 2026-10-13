-- Marketing analytics: share links / ambassadors / forms
CREATE OR REPLACE FUNCTION public.crm_marketing_analytics(
  p_organization_id bigint,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_business_unit_id bigint DEFAULT NULL::bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_empty jsonb := jsonb_build_object(
    'kpis', jsonb_build_object(
      'leads', 0,
      'converted', 0,
      'lost', 0,
      'conversion_rate', 0,
      'revenue_cents', 0,
      'clicks', 0
    ),
    'leads_series', '[]'::jsonb,
    'revenue_series', '[]'::jsonb,
    'links', '[]'::jsonb,
    'ambassadors', '[]'::jsonb,
    'forms', '[]'::jsonb,
    'channels', '[]'::jsonb
  );
  v_result jsonb;
  v_scope text;
BEGIN
  IF p_organization_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN v_empty;
  END IF;

  IF NOT public.has_org_capability(p_organization_id, 'analytics.view') THEN
    RETURN v_empty;
  END IF;

  v_scope := public.org_permission_scope(p_organization_id);
  IF v_scope IS DISTINCT FROM 'org' AND v_scope IS DISTINCT FROM 'bu' THEN
    RETURN v_empty;
  END IF;

  IF p_to < p_from THEN
    RETURN v_empty;
  END IF;

  WITH   marketing_leads AS (
    SELECT
      l.id,
      l.form_id,
      l.ambassador_link_id,
      l.business_unit_id,
      l.status,
      l.organization_sale_id,
      l.enrollment_id,
      l.created_at
    FROM public.leads l
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= p_from
      AND l.created_at <= p_to
      AND (l.origin = 'form' OR l.ambassador_link_id IS NOT NULL)
      AND public.lead_in_scope(
        l.organization_id,
        l.id,
        l.business_unit_id,
        l.owner_id,
        l.created_by_member_id,
        l.ambassador_link_id
      )
      AND (
        p_business_unit_id IS NULL
        OR l.business_unit_id = p_business_unit_id
      )
  ),
  marketing_sales AS (
    SELECT
      s.id AS sale_id,
      s.price,
      s.sold_at,
      l.id AS lead_id,
      l.form_id,
      l.ambassador_link_id
    FROM public.organization_sales s
    JOIN public.leads l
      ON l.organization_id = s.organization_id
     AND (
       l.organization_sale_id = s.id
       OR (
         s.enrollment_id IS NOT NULL
         AND l.enrollment_id = s.enrollment_id
       )
     )
    WHERE s.organization_id = p_organization_id
      AND s.sold_at >= p_from
      AND s.sold_at <= p_to
      AND (l.origin = 'form' OR l.ambassador_link_id IS NOT NULL)
      AND public.lead_in_scope(
        l.organization_id,
        l.id,
        l.business_unit_id,
        l.owner_id,
        l.created_by_member_id,
        l.ambassador_link_id
      )
      AND (
        p_business_unit_id IS NULL
        OR l.business_unit_id = p_business_unit_id
      )
  ),
  sales_dedup AS (
    SELECT
      sale_id,
      MAX(price) AS price,
      MAX(form_id) AS form_id,
      MAX(ambassador_link_id) AS ambassador_link_id,
      MAX(sold_at) AS sold_at
    FROM marketing_sales
    GROUP BY sale_id
  ),
  leads_series AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'day', d.day,
          'leads', d.leads,
          'converted', d.converted
        )
        ORDER BY d.day
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        (timezone('UTC', ml.created_at))::date::text AS day,
        COUNT(*)::bigint AS leads,
        COUNT(*) FILTER (WHERE ml.status = 'converted')::bigint AS converted
      FROM marketing_leads ml
      GROUP BY 1
    ) d
  ),
  revenue_series AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'day', d.day,
          'revenue_cents', d.revenue_cents
        )
        ORDER BY d.day
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        (timezone('UTC', sd.sold_at))::date::text AS day,
        SUM(sd.price)::bigint AS revenue_cents
      FROM sales_dedup sd
      GROUP BY 1
    ) d
  ),
  kpi AS (
    SELECT
      (SELECT COUNT(*)::bigint FROM marketing_leads) AS leads,
      (SELECT COUNT(*)::bigint FROM marketing_leads WHERE status = 'converted') AS converted,
      (SELECT COUNT(*)::bigint FROM marketing_leads WHERE status = 'lost') AS lost,
      (SELECT COALESCE(SUM(price), 0)::bigint FROM sales_dedup) AS revenue_cents
  ),
  lead_by_link AS (
    SELECT
      ambassador_link_id AS link_id,
      COUNT(*)::bigint AS leads,
      COUNT(*) FILTER (WHERE status = 'converted')::bigint AS converted
    FROM marketing_leads
    WHERE ambassador_link_id IS NOT NULL
    GROUP BY ambassador_link_id
  ),
  sales_by_link AS (
    SELECT
      ambassador_link_id AS link_id,
      COALESCE(SUM(price), 0)::bigint AS revenue_cents
    FROM sales_dedup
    WHERE ambassador_link_id IS NOT NULL
    GROUP BY ambassador_link_id
  ),
  link_stats AS (
    SELECT
      al.id AS link_id,
      al.label,
      al.ref_code,
      al.member_id,
      al.form_id,
      al.clicks_count,
      al.business_unit_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), om.email, 'Member') AS member_name,
      COALESCE(f.title, 'Form') AS form_title,
      COALESCE(lbl.leads, 0)::bigint AS leads,
      COALESCE(lbl.converted, 0)::bigint AS converted,
      COALESCE(sbl.revenue_cents, 0)::bigint AS revenue_cents
    FROM public.crm_ambassador_links al
    JOIN public.organization_members om ON om.id = al.member_id
    LEFT JOIN public.profiles p ON p.user_id = om.user_id
    JOIN public.crm_forms f ON f.id = al.form_id
    LEFT JOIN lead_by_link lbl ON lbl.link_id = al.id
    LEFT JOIN sales_by_link sbl ON sbl.link_id = al.id
    WHERE al.organization_id = p_organization_id
      AND public.ambassador_link_in_scope(
        al.organization_id,
        al.member_id,
        al.business_unit_id
      )
      AND (
        p_business_unit_id IS NULL
        OR al.business_unit_id = p_business_unit_id
      )
      AND (
        COALESCE(lbl.leads, 0) > 0
        OR COALESCE(sbl.revenue_cents, 0) > 0
      )
  ),
  links AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'link_id', ls.link_id,
          'label', ls.label,
          'ref_code', ls.ref_code,
          'member_id', ls.member_id,
          'member_name', ls.member_name,
          'form_id', ls.form_id,
          'form_title', ls.form_title,
          'clicks', ls.clicks_count,
          'leads', ls.leads,
          'converted', ls.converted,
          'conversion_rate',
            CASE
              WHEN ls.leads > 0 THEN ROUND((ls.converted::numeric / ls.leads::numeric) * 100, 1)
              ELSE 0
            END,
          'revenue_cents', ls.revenue_cents
        )
        ORDER BY ls.leads DESC, ls.revenue_cents DESC, ls.label ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM link_stats ls
  ),
  ambassadors AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'member_id', a.member_id,
          'member_name', a.member_name,
          'links', a.links,
          'clicks', a.clicks,
          'leads', a.leads,
          'converted', a.converted,
          'conversion_rate',
            CASE
              WHEN a.leads > 0 THEN ROUND((a.converted::numeric / a.leads::numeric) * 100, 1)
              ELSE 0
            END,
          'revenue_cents', a.revenue_cents
        )
        ORDER BY a.leads DESC, a.revenue_cents DESC, a.member_name ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        ls.member_id,
        MAX(ls.member_name) AS member_name,
        COUNT(*)::bigint AS links,
        COALESCE(SUM(ls.clicks_count), 0)::bigint AS clicks,
        COALESCE(SUM(ls.leads), 0)::bigint AS leads,
        COALESCE(SUM(ls.converted), 0)::bigint AS converted,
        COALESCE(SUM(ls.revenue_cents), 0)::bigint AS revenue_cents
      FROM link_stats ls
      GROUP BY ls.member_id
    ) a
  ),
  forms AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'form_id', f.form_id,
          'form_title', f.form_title,
          'leads', f.leads,
          'converted', f.converted,
          'conversion_rate',
            CASE
              WHEN f.leads > 0 THEN ROUND((f.converted::numeric / f.leads::numeric) * 100, 1)
              ELSE 0
            END,
          'revenue_cents', f.revenue_cents
        )
        ORDER BY f.leads DESC, f.revenue_cents DESC, f.form_title ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        ml.form_id,
        COALESCE(MAX(cf.title), 'Form') AS form_title,
        COUNT(*)::bigint AS leads,
        COUNT(*) FILTER (WHERE ml.status = 'converted')::bigint AS converted,
        COALESCE(sb.revenue_cents, 0)::bigint AS revenue_cents
      FROM marketing_leads ml
      LEFT JOIN public.crm_forms cf ON cf.id = ml.form_id
      LEFT JOIN (
        SELECT form_id, COALESCE(SUM(price), 0)::bigint AS revenue_cents
        FROM sales_dedup
        WHERE form_id IS NOT NULL
        GROUP BY form_id
      ) sb ON sb.form_id = ml.form_id
      WHERE ml.form_id IS NOT NULL
      GROUP BY ml.form_id, sb.revenue_cents
    ) f
  ),
  channels AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'channel', c.channel,
          'clicks', c.clicks,
          'leads', c.leads,
          'converted', c.converted,
          'conversion_rate',
            CASE
              WHEN c.leads > 0 THEN ROUND((c.converted::numeric / c.leads::numeric) * 100, 1)
              ELSE 0
            END,
          'revenue_cents', c.revenue_cents
        )
        ORDER BY c.leads DESC, c.revenue_cents DESC, c.channel ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        COALESCE(NULLIF(btrim(ls.label), ''), 'Untitled') AS channel,
        COALESCE(SUM(ls.clicks_count), 0)::bigint AS clicks,
        COALESCE(SUM(ls.leads), 0)::bigint AS leads,
        COALESCE(SUM(ls.converted), 0)::bigint AS converted,
        COALESCE(SUM(ls.revenue_cents), 0)::bigint AS revenue_cents
      FROM link_stats ls
      GROUP BY COALESCE(NULLIF(btrim(ls.label), ''), 'Untitled')
    ) c
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'leads', k.leads,
      'converted', k.converted,
      'lost', k.lost,
      'conversion_rate',
        CASE
          WHEN k.leads > 0 THEN ROUND((k.converted::numeric / k.leads::numeric) * 100, 1)
          ELSE 0
        END,
      'revenue_cents', k.revenue_cents,
      'clicks', COALESCE((SELECT SUM(clicks_count)::bigint FROM link_stats), 0)
    ),
    'leads_series', ls.payload,
    'revenue_series', rs.payload,
    'links', l.payload,
    'ambassadors', a.payload,
    'forms', f.payload,
    'channels', c.payload
  )
  INTO v_result
  FROM kpi k, leads_series ls, revenue_series rs, links l, ambassadors a, forms f, channels c;

  RETURN COALESCE(v_result, v_empty);
END;
$function$;
