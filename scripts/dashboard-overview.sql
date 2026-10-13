-- Overview Home: member (default) | org (cap analytics.view) | bu (is_bu_owner status)
DROP FUNCTION IF EXISTS public.dashboard_overview(bigint);
DROP FUNCTION IF EXISTS public.dashboard_overview(bigint, text);

CREATE OR REPLACE FUNCTION public.dashboard_overview(
  p_organization_id bigint,
  p_viewer_mode text DEFAULT 'member'::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_empty jsonb := jsonb_build_object(
    'viewer_mode', 'member',
    'scope', 'own',
    'kpis', jsonb_build_object(
      'revenue_cents', 0,
      'revenue_prev_cents', 0,
      'leads', 0,
      'leads_prev', 0,
      'converted', 0,
      'converted_prev', 0,
      'active_clients', 0,
      'my_leads', 0,
      'my_leads_prev', 0,
      'my_converted', 0,
      'my_converted_prev', 0,
      'commissions_earned_cents', 0,
      'commissions_earned_prev_cents', 0,
      'commissions_pending_cents', 0
    ),
    'attention', jsonb_build_object(
      'unassigned_coaching', 0,
      'leads_new', 0,
      'payouts_overdue', 0,
      'my_coaching_packs', 0,
      'new_coaching_assignments', 0
    ),
    'recent_sales', '[]'::jsonb,
    'top_products', '[]'::jsonb,
    'recent_activity', '[]'::jsonb,
    'recent_leads', '[]'::jsonb,
    'top_forms', '[]'::jsonb,
    'ambassador_links', '[]'::jsonb,
    'coaching', NULL
  );
  v_member_id bigint;
  v_scope text;
  v_mode text;
  v_requested text;
  v_bu_only boolean;
  v_from timestamptz;
  v_to timestamptz;
  v_prev_from timestamptz;
  v_prev_to timestamptz;
  v_result jsonb;
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN v_empty;
  END IF;

  v_member_id := public.current_org_member_id(p_organization_id);
  IF v_member_id IS NULL AND NOT public.is_org_owner(p_organization_id) THEN
    RETURN v_empty;
  END IF;

  v_scope := public.org_permission_scope(p_organization_id);
  v_requested := lower(coalesce(nullif(btrim(p_viewer_mode), ''), 'member'));
  v_mode := 'member';
  v_bu_only := false;

  -- BU view: status-based (owns ≥1 active BU), no capability gate
  IF v_requested = 'bu' AND public.is_bu_owner(p_organization_id) THEN
    v_mode := 'bu';
    v_bu_only := true;
  ELSIF v_requested = 'org'
    AND v_scope = 'org'
    AND public.has_org_capability(p_organization_id, 'analytics.view')
  THEN
    v_mode := 'org';
    v_bu_only := false;
  END IF;

  v_to := now();
  v_from := v_to - interval '30 days';
  v_prev_to := v_from;
  v_prev_from := v_prev_to - interval '30 days';

  IF v_mode = 'org' OR v_mode = 'bu' THEN
    WITH owned_bus AS (
      SELECT bu.id
      FROM public.business_units bu
      WHERE bu.organization_id = p_organization_id
        AND bu.status = 'active'
        AND bu.owner_member_id = v_member_id
    ),
    scoped_leads AS (
      SELECT l.*
      FROM public.leads l
      WHERE l.organization_id = p_organization_id
        AND (
          NOT v_bu_only
          OR l.business_unit_id IN (SELECT id FROM owned_bus)
        )
    ),
    scoped_sales AS (
      SELECT s.*
      FROM public.organization_sales s
      LEFT JOIN public.enrollments e ON e.id = s.enrollment_id
      LEFT JOIN public.offers o ON o.id = e.offer_id
      WHERE s.organization_id = p_organization_id
        AND (
          NOT v_bu_only
          OR o.business_unit_id IN (SELECT id FROM owned_bus)
        )
    ),
    kpis AS (
      SELECT
        COALESCE((
          SELECT SUM(s.price)::bigint FROM scoped_sales s
          WHERE COALESCE(s.sold_at, s.created_at) >= v_from
            AND COALESCE(s.sold_at, s.created_at) <= v_to
        ), 0) AS revenue_cents,
        COALESCE((
          SELECT SUM(s.price)::bigint FROM scoped_sales s
          WHERE COALESCE(s.sold_at, s.created_at) >= v_prev_from
            AND COALESCE(s.sold_at, s.created_at) < v_prev_to
        ), 0) AS revenue_prev_cents,
        COALESCE((
          SELECT COUNT(*)::bigint FROM scoped_leads l
          WHERE l.created_at >= v_from AND l.created_at <= v_to
        ), 0) AS leads,
        COALESCE((
          SELECT COUNT(*)::bigint FROM scoped_leads l
          WHERE l.created_at >= v_prev_from AND l.created_at < v_prev_to
        ), 0) AS leads_prev,
        COALESCE((
          SELECT COUNT(*)::bigint FROM scoped_leads l
          WHERE l.created_at >= v_from AND l.created_at <= v_to
            AND l.status = 'converted'
        ), 0) AS converted,
        COALESCE((
          SELECT COUNT(*)::bigint FROM scoped_leads l
          WHERE l.created_at >= v_prev_from AND l.created_at < v_prev_to
            AND l.status = 'converted'
        ), 0) AS converted_prev,
        COALESCE((
          SELECT COUNT(DISTINCT COALESCE(e.user_id::text, e.buyer_email))::bigint
          FROM public.enrollments e
          LEFT JOIN public.offers o ON o.id = e.offer_id
          WHERE e.organization_id = p_organization_id
            AND e.status = 'active'
            AND (e.expires_at IS NULL OR e.expires_at > now())
            AND (
              NOT v_bu_only
              OR o.business_unit_id IN (SELECT id FROM owned_bus)
            )
        ), 0) AS active_clients
    ),
    attention AS (
      SELECT
        COALESCE((
          SELECT COUNT(*)::integer
          FROM public.enrollment_products ep
          JOIN public.enrollments e ON e.id = ep.enrollment_id
          JOIN public.products p ON p.id = ep.product_id
          LEFT JOIN public.offers o ON o.id = e.offer_id
          WHERE e.organization_id = p_organization_id
            AND p.type = 'coaching'
            AND e.status = ANY (ARRAY['active'::text, 'paused'::text])
            AND (e.expires_at IS NULL OR e.expires_at > now())
            AND NOT EXISTS (
              SELECT 1 FROM public.coaching_assignments ca
              WHERE ca.enrollment_product_id = ep.id
            )
            AND (
              NOT v_bu_only
              OR o.business_unit_id IN (SELECT id FROM owned_bus)
            )
        ), 0) AS unassigned_coaching,
        COALESCE((
          SELECT COUNT(*)::integer FROM scoped_leads l
          WHERE l.status = 'new'
        ), 0) AS leads_new,
        COALESCE((
          SELECT COUNT(*)::integer
          FROM public.commissions c
          WHERE c.organization_id = p_organization_id
            AND c.status = 'pending'
            AND c.due_at IS NOT NULL
            AND c.due_at < now()
            AND (
              NOT v_bu_only
              OR c.business_unit_id IN (SELECT id FROM owned_bus)
            )
        ), 0) AS payouts_overdue
    ),
    recent_sales AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'created_at', t.sold_at,
            'amount', t.amount,
            'currency', t.currency,
            'buyer_email', t.buyer_email,
            'user_full_name', t.user_full_name,
            'offer_title', t.offer_title
          )
          ORDER BY t.sold_at DESC
        ),
        '[]'::jsonb
      ) AS payload
      FROM (
        SELECT
          s.id,
          COALESCE(s.sold_at, s.created_at) AS sold_at,
          s.price AS amount,
          s.currency,
          s.buyer_email,
          profiles.full_name AS user_full_name,
          o.title AS offer_title
        FROM scoped_sales s
        LEFT JOIN public.enrollments e ON e.id = s.enrollment_id
        LEFT JOIN public.profiles profiles ON profiles.user_id = s.user_id
        LEFT JOIN public.offers o ON o.id = e.offer_id
        ORDER BY COALESCE(s.sold_at, s.created_at) DESC
        LIMIT 5
      ) t
    ),
    top_products AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'product_id', tp.product_id,
            'title', tp.title,
            'type', tp.type,
            'total_enrollments', tp.total_enrollments
          )
          ORDER BY tp.total_enrollments DESC
        ),
        '[]'::jsonb
      ) AS payload
      FROM (
        SELECT
          p.id AS product_id,
          p.title,
          p.type,
          COUNT(DISTINCT ep.enrollment_id)::bigint AS total_enrollments
        FROM public.products p
        JOIN public.enrollment_products ep ON ep.product_id = p.id
        JOIN public.enrollments e ON e.id = ep.enrollment_id
        LEFT JOIN public.offers o ON o.id = e.offer_id
        WHERE p.organization_id = p_organization_id
          AND (
            NOT v_bu_only
            OR o.business_unit_id IN (SELECT id FROM owned_bus)
          )
        GROUP BY p.id, p.title, p.type
        ORDER BY COUNT(DISTINCT ep.enrollment_id) DESC
        LIMIT 5
      ) tp
    ),
    recent_leads AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'full_name', t.full_name,
            'email', t.email,
            'status', t.status,
            'created_at', t.created_at
          )
          ORDER BY t.created_at DESC
        ),
        '[]'::jsonb
      ) AS payload
      FROM (
        SELECT
          l.id,
          NULLIF(btrim(l.full_name), '') AS full_name,
          l.email,
          l.status,
          l.created_at
        FROM scoped_leads l
        ORDER BY l.created_at DESC
        LIMIT 8
      ) t
    ),
    top_forms AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'form_id', t.form_id,
            'title', t.title,
            'leads', t.leads,
            'converted', t.converted,
            'clicks', t.clicks
          )
          ORDER BY t.leads DESC, t.clicks DESC, t.title ASC
        ),
        '[]'::jsonb
      ) AS payload
      FROM (
        SELECT
          f.id AS form_id,
          COALESCE(NULLIF(btrim(f.title), ''), 'Form') AS title,
          COALESCE((
            SELECT COUNT(*)::bigint
            FROM scoped_leads l
            WHERE l.form_id = f.id
              AND l.created_at >= v_from
              AND l.created_at <= v_to
          ), 0) AS leads,
          COALESCE((
            SELECT COUNT(*)::bigint
            FROM scoped_leads l
            WHERE l.form_id = f.id
              AND l.created_at >= v_from
              AND l.created_at <= v_to
              AND l.status = 'converted'
          ), 0) AS converted,
          COALESCE((
            SELECT SUM(COALESCE(al.clicks_count, 0))::bigint
            FROM public.crm_ambassador_links al
            WHERE al.organization_id = p_organization_id
              AND al.form_id = f.id
              AND (
                NOT v_bu_only
                OR al.business_unit_id IN (SELECT id FROM owned_bus)
              )
          ), 0) AS clicks
        FROM public.crm_forms f
        WHERE f.organization_id = p_organization_id
          AND EXISTS (
            SELECT 1
            FROM scoped_leads l
            WHERE l.form_id = f.id
              AND l.created_at >= v_from
              AND l.created_at <= v_to
          )
        ORDER BY leads DESC, clicks DESC, title ASC
        LIMIT 5
      ) t
    )
    SELECT jsonb_build_object(
      'viewer_mode', v_mode,
      'scope', CASE WHEN v_bu_only THEN 'bu' ELSE 'org' END,
      'kpis', jsonb_build_object(
        'revenue_cents', k.revenue_cents,
        'revenue_prev_cents', k.revenue_prev_cents,
        'leads', k.leads,
        'leads_prev', k.leads_prev,
        'converted', k.converted,
        'converted_prev', k.converted_prev,
        'active_clients', k.active_clients,
        'my_leads', 0,
        'my_leads_prev', 0,
        'my_converted', 0,
        'my_converted_prev', 0,
        'commissions_earned_cents', 0,
        'commissions_earned_prev_cents', 0,
        'commissions_pending_cents', 0
      ),
      'attention', jsonb_build_object(
        'unassigned_coaching', a.unassigned_coaching,
        'leads_new', a.leads_new,
        'payouts_overdue', a.payouts_overdue,
        'my_coaching_packs', 0,
        'new_coaching_assignments', 0
      ),
      'recent_sales', rs.payload,
      'top_products', tp.payload,
      'recent_activity', '[]'::jsonb,
      'recent_leads', rl.payload,
      'top_forms', tf.payload,
      'ambassador_links', '[]'::jsonb,
      'coaching', NULL
    )
    INTO v_result
    FROM kpis k, attention a, recent_sales rs, top_products tp, recent_leads rl, top_forms tf;

    RETURN COALESCE(v_result, v_empty);
  END IF;

  -- Member view
  WITH my_leads AS (
    SELECT l.*
    FROM public.leads l
    WHERE l.organization_id = p_organization_id
      AND v_member_id IS NOT NULL
      AND public.lead_is_own(
        l.organization_id,
        l.id,
        l.owner_id,
        l.created_by_member_id,
        l.ambassador_link_id
      )
  ),
  my_assignments AS (
    SELECT
      ca.id,
      ca.created_at,
      ep.id AS enrollment_product_id,
      e.id AS enrollment_id
    FROM public.coaching_assignments ca
    JOIN public.enrollment_products ep ON ep.id = ca.enrollment_product_id
    JOIN public.enrollments e ON e.id = ep.enrollment_id
    WHERE e.organization_id = p_organization_id
      AND ca.organization_member_id = v_member_id
      AND e.status = ANY (ARRAY['active'::text, 'paused'::text])
      AND (e.expires_at IS NULL OR e.expires_at > now())
  ),
  kpis AS (
    SELECT
      COALESCE((
        SELECT COUNT(*)::bigint FROM my_leads l
        WHERE l.created_at >= v_from AND l.created_at <= v_to
      ), 0) AS my_leads,
      COALESCE((
        SELECT COUNT(*)::bigint FROM my_leads l
        WHERE l.created_at >= v_prev_from AND l.created_at < v_prev_to
      ), 0) AS my_leads_prev,
      COALESCE((
        SELECT COUNT(*)::bigint FROM my_leads l
        WHERE l.created_at >= v_from AND l.created_at <= v_to
          AND l.status = 'converted'
      ), 0) AS my_converted,
      COALESCE((
        SELECT COUNT(*)::bigint FROM my_leads l
        WHERE l.created_at >= v_prev_from AND l.created_at < v_prev_to
          AND l.status = 'converted'
      ), 0) AS my_converted_prev,
      COALESCE((
        SELECT SUM(c.commission_amount)::bigint
        FROM public.commissions c
        WHERE c.organization_id = p_organization_id
          AND c.beneficiary_member_id = v_member_id
          AND c.created_at >= v_from
          AND c.created_at <= v_to
      ), 0) AS commissions_earned_cents,
      COALESCE((
        SELECT SUM(c.commission_amount)::bigint
        FROM public.commissions c
        WHERE c.organization_id = p_organization_id
          AND c.beneficiary_member_id = v_member_id
          AND c.created_at >= v_prev_from
          AND c.created_at < v_prev_to
      ), 0) AS commissions_earned_prev_cents,
      COALESCE((
        SELECT SUM(c.commission_amount)::bigint
        FROM public.commissions c
        WHERE c.organization_id = p_organization_id
          AND c.beneficiary_member_id = v_member_id
          AND c.status = 'pending'
      ), 0) AS commissions_pending_cents
  ),
  attention AS (
    SELECT
      COALESCE((
        SELECT COUNT(*)::integer FROM my_leads l WHERE l.status = 'new'
      ), 0) AS leads_new,
      COALESCE((
        SELECT COUNT(*)::integer
        FROM public.commissions c
        WHERE c.organization_id = p_organization_id
          AND c.beneficiary_member_id = v_member_id
          AND c.status = 'pending'
          AND c.due_at IS NOT NULL
          AND c.due_at < now()
      ), 0) AS payouts_overdue,
      COALESCE((SELECT COUNT(*)::integer FROM my_assignments), 0) AS my_coaching_packs,
      COALESCE((
        SELECT COUNT(*)::integer
        FROM my_assignments ma
        WHERE ma.created_at >= now() - interval '3 days'
      ), 0) AS new_coaching_assignments
  ),
  recent_leads AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'full_name', t.full_name,
          'email', t.email,
          'status', t.status,
          'created_at', t.created_at
        )
        ORDER BY t.created_at DESC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        l.id,
        NULLIF(btrim(l.full_name), '') AS full_name,
        l.email,
        l.status,
        l.created_at
      FROM my_leads l
      ORDER BY l.created_at DESC
      LIMIT 8
    ) t
  ),
  ambassador_links AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'link_id', t.link_id,
          'label', t.label,
          'clicks', t.clicks,
          'leads', t.leads,
          'converted', t.converted
        )
        ORDER BY t.clicks DESC, t.label ASC
      ),
      '[]'::jsonb
    ) AS payload
    FROM (
      SELECT
        al.id AS link_id,
        COALESCE(NULLIF(btrim(al.label), ''), al.ref_code, 'Link') AS label,
        COALESCE(al.clicks_count, 0)::bigint AS clicks,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM my_leads l
          WHERE l.ambassador_link_id = al.id
            AND l.created_at >= v_from
            AND l.created_at <= v_to
        ), 0) AS leads,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM my_leads l
          WHERE l.ambassador_link_id = al.id
            AND l.created_at >= v_from
            AND l.created_at <= v_to
            AND l.status = 'converted'
        ), 0) AS converted
      FROM public.crm_ambassador_links al
      WHERE al.organization_id = p_organization_id
        AND al.member_id = v_member_id
      ORDER BY COALESCE(al.clicks_count, 0) DESC, al.id ASC
      LIMIT 5
    ) t
  ),
  coaching AS (
    SELECT
      COALESCE((SELECT COUNT(*)::integer FROM my_assignments), 0) AS packs_active,
      COALESCE((
        SELECT COUNT(*)::integer
        FROM public.coaching_sessions cs
        JOIN my_assignments ma ON ma.id = cs.coaching_assignment_id
        WHERE cs.completed_at IS NULL
      ), 0) AS sessions_open
  )
  SELECT jsonb_build_object(
    'viewer_mode', 'member',
    'scope', 'own',
    'kpis', jsonb_build_object(
      'revenue_cents', 0,
      'revenue_prev_cents', 0,
      'leads', 0,
      'leads_prev', 0,
      'converted', 0,
      'converted_prev', 0,
      'active_clients', 0,
      'my_leads', k.my_leads,
      'my_leads_prev', k.my_leads_prev,
      'my_converted', k.my_converted,
      'my_converted_prev', k.my_converted_prev,
      'commissions_earned_cents', k.commissions_earned_cents,
      'commissions_earned_prev_cents', k.commissions_earned_prev_cents,
      'commissions_pending_cents', k.commissions_pending_cents
    ),
    'attention', jsonb_build_object(
      'unassigned_coaching', 0,
      'leads_new', a.leads_new,
      'payouts_overdue', a.payouts_overdue,
      'my_coaching_packs', a.my_coaching_packs,
      'new_coaching_assignments', a.new_coaching_assignments
    ),
    'recent_sales', '[]'::jsonb,
    'top_products', '[]'::jsonb,
    'recent_activity', '[]'::jsonb,
    'recent_leads', rl.payload,
    'top_forms', '[]'::jsonb,
    'ambassador_links', al.payload,
    'coaching',
      CASE
        WHEN c.packs_active > 0 THEN jsonb_build_object(
          'packs_active', c.packs_active,
          'sessions_open', c.sessions_open
        )
        ELSE NULL
      END
  )
  INTO v_result
  FROM kpis k, attention a, recent_leads rl, ambassador_links al, coaching c;

  RETURN COALESCE(v_result, v_empty);
END;
$function$;
