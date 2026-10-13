-- Analytics: analytics.view gate + org|head viewer modes
CREATE OR REPLACE FUNCTION public.crm_sales_analytics(
  p_organization_id bigint,
  p_from timestamp with time zone,
  p_to timestamp with time zone,
  p_business_unit_id bigint DEFAULT NULL::bigint,
  p_preset text DEFAULT 'custom'::text,
  p_viewer_mode text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_empty jsonb := jsonb_build_object(
    'viewer_mode', 'org',
    'kpis', jsonb_build_object(
      'leads', 0,
      'converted', 0,
      'conversion_rate', 0,
      'revenue_cents', 0,
      'commissions_cents', 0,
      'commissions_paid_cents', 0,
      'margin_cents', 0,
      'head_commissions_cents', 0,
      'head_commissions_paid_cents', 0,
      'team_commissions_cents', 0,
      'team_commissions_paid_cents', 0
    ),
    'revenue_series', '[]'::jsonb,
    'commission_series', '[]'::jsonb,
    'members', '[]'::jsonb,
    'packs', '[]'::jsonb,
    'business_units', '[]'::jsonb,
    'funnel', '[]'::jsonb
  );
  v_result jsonb;
  v_from_date date;
  v_to_date date;
  v_span integer;
  v_hist_from date;
  v_hist_to date;
  v_fc_from date;
  v_fc_to date;
  v_grain text;
  v_preset text;
  v_scope text;
  v_mode text;
  v_member_id bigint;
  v_head_member_id bigint;
  v_mode_requested text;
BEGIN
  IF p_organization_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN v_empty;
  END IF;

  IF NOT public.has_org_capability(p_organization_id, 'analytics.view') THEN
    RETURN v_empty;
  END IF;

  v_scope := public.org_permission_scope(p_organization_id);
  v_member_id := public.current_org_member_id(p_organization_id);
  v_mode_requested := lower(coalesce(nullif(btrim(p_viewer_mode), ''), ''));

  IF v_scope = 'org' THEN
    IF v_mode_requested = 'head' THEN
      IF p_business_unit_id IS NULL THEN
        RETURN v_empty;
      END IF;
      SELECT bu.owner_member_id
        INTO v_head_member_id
      FROM public.business_units bu
      WHERE bu.id = p_business_unit_id
        AND bu.organization_id = p_organization_id
        AND bu.status = 'active';
      IF v_head_member_id IS NULL THEN
        RETURN v_empty;
      END IF;
      v_mode := 'head';
    ELSE
      v_mode := 'org';
      v_head_member_id := NULL;
    END IF;
  ELSIF v_scope = 'bu' THEN
    -- Natural Head: always head mode (ignore org request)
    v_mode := 'head';
    v_head_member_id := v_member_id;
    IF p_business_unit_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.business_units bu
         WHERE bu.id = p_business_unit_id
           AND bu.organization_id = p_organization_id
           AND bu.owner_member_id = v_member_id
           AND bu.status = 'active'
       ) THEN
      RETURN v_empty;
    END IF;
  ELSE
    RETURN v_empty;
  END IF;

  v_from_date := (timezone('UTC', p_from))::date;
  v_to_date := (timezone('UTC', p_to))::date;
  IF v_to_date < v_from_date THEN
    RETURN v_empty;
  END IF;

  v_span := (v_to_date - v_from_date) + 1;
  v_preset := lower(coalesce(nullif(btrim(p_preset), ''), 'custom'));

  IF v_preset = 'month' THEN
    v_hist_from := date_trunc('month', v_to_date::timestamp)::date;
    v_hist_to := v_to_date;
    v_fc_from := (date_trunc('month', v_to_date::timestamp) + INTERVAL '1 month')::date;
    v_fc_to := (date_trunc('month', v_to_date::timestamp) + INTERVAL '2 months' - INTERVAL '1 day')::date;
    v_grain := 'day';
  ELSIF v_preset = 'quarter' THEN
    v_hist_from := date_trunc('quarter', v_to_date::timestamp)::date;
    v_hist_to := v_to_date;
    v_fc_from := (date_trunc('quarter', v_to_date::timestamp) + INTERVAL '3 months')::date;
    v_fc_to := (date_trunc('quarter', v_to_date::timestamp) + INTERVAL '6 months' - INTERVAL '1 day')::date;
    v_grain := 'month';
  ELSIF v_preset = 'year' THEN
    v_hist_from := date_trunc('year', v_to_date::timestamp)::date;
    v_hist_to := v_to_date;
    v_fc_from := (date_trunc('month', v_to_date::timestamp) + INTERVAL '1 month')::date;
    v_fc_to := (date_trunc('month', v_to_date::timestamp) + INTERVAL '4 months' - INTERVAL '1 day')::date;
    v_grain := 'month';
  ELSE
    v_hist_from := v_from_date;
    v_hist_to := v_to_date;
    v_fc_from := v_to_date + 1;
    v_fc_to := v_to_date + v_span;
    v_grain := CASE WHEN v_span <= 62 THEN 'day' ELSE 'month' END;
  END IF;

  WITH scoped_leads AS (
    SELECT
      l.id,
      l.organization_id,
      l.business_unit_id,
      l.owner_id,
      l.status,
      l.organization_sale_id,
      l.target_offer_id
    FROM public.leads l
    WHERE l.organization_id = p_organization_id
      AND l.created_at >= p_from
      AND l.created_at <= p_to
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
  scoped_sales AS (
    SELECT
      s.id,
      s.price,
      s.sold_at,
      s.enrollment_id,
      COALESCE(e.offer_id, l_sale.target_offer_id, l_enroll.target_offer_id) AS offer_id,
      COALESCE(o.title, o_target.title) AS offer_title,
      COALESCE(
        o.business_unit_id,
        l_sale.business_unit_id,
        l_enroll.business_unit_id
      ) AS sale_bu_id
    FROM public.organization_sales s
    LEFT JOIN public.enrollments e
      ON e.id = s.enrollment_id
    LEFT JOIN public.offers o
      ON o.id = e.offer_id
    LEFT JOIN public.leads l_sale
      ON l_sale.organization_sale_id = s.id
     AND l_sale.organization_id = s.organization_id
    LEFT JOIN public.leads l_enroll
      ON s.enrollment_id IS NOT NULL
     AND l_enroll.enrollment_id = s.enrollment_id
     AND l_enroll.organization_id = s.organization_id
    LEFT JOIN public.offers o_target
      ON o_target.id = COALESCE(l_sale.target_offer_id, l_enroll.target_offer_id)
    WHERE s.organization_id = p_organization_id
      AND s.sold_at >= p_from
      AND s.sold_at <= p_to
      AND (
        public.sales_row_in_scope(s.organization_id, s.enrollment_id, s.id)
        OR (
          COALESCE(l_sale.id, l_enroll.id) IS NOT NULL
          AND public.lead_in_scope(
            s.organization_id,
            COALESCE(l_sale.id, l_enroll.id),
            COALESCE(l_sale.business_unit_id, l_enroll.business_unit_id),
            COALESCE(l_sale.owner_id, l_enroll.owner_id),
            COALESCE(l_sale.created_by_member_id, l_enroll.created_by_member_id),
            COALESCE(l_sale.ambassador_link_id, l_enroll.ambassador_link_id)
          )
        )
      )
      AND (
        p_business_unit_id IS NULL
        OR COALESCE(
          o.business_unit_id,
          l_sale.business_unit_id,
          l_enroll.business_unit_id
        ) = p_business_unit_id
      )
  ),
  sale_commissions AS (
    SELECT
      ss.id AS sale_id,
      ss.sale_bu_id,
      COALESCE(SUM(c.commission_amount), 0)::bigint AS commissions_cents
    FROM scoped_sales ss
    LEFT JOIN public.commissions c
      ON c.organization_sale_id = ss.id
     AND c.status IS DISTINCT FROM 'canceled'::commission_status
    GROUP BY ss.id, ss.sale_bu_id
  ),
  period_settlements AS (
    SELECT
      s.id,
      s.business_unit_id,
      s.owner_member_id,
      s.amount_cents,
      s.status,
      s.due_at,
      s.paid_at,
      s.period_start,
      s.period_end
    FROM public.bu_owner_settlements s
    WHERE s.organization_id = p_organization_id
      AND s.period_start <= v_to_date
      AND s.period_end >= v_from_date
      AND (
        p_business_unit_id IS NULL
        OR s.business_unit_id = p_business_unit_id
      )
      AND (
        v_mode = 'org'
        OR (
          v_mode = 'head'
          AND s.owner_member_id = v_head_member_id
        )
      )
  ),
  paid_settlements AS (
    SELECT
      s.id,
      s.business_unit_id,
      s.owner_member_id,
      s.amount_cents,
      s.paid_at
    FROM public.bu_owner_settlements s
    WHERE s.organization_id = p_organization_id
      AND s.status = 'paid'
      AND s.paid_at IS NOT NULL
      AND s.paid_at >= p_from
      AND s.paid_at <= p_to
      AND (
        p_business_unit_id IS NULL
        OR s.business_unit_id = p_business_unit_id
      )
      AND (
        v_mode = 'org'
        OR (
          v_mode = 'head'
          AND s.owner_member_id = v_head_member_id
        )
      )
  ),
  forecast_settlements AS (
    SELECT
      s.id,
      s.business_unit_id,
      s.owner_member_id,
      s.amount_cents,
      (timezone('UTC', s.due_at))::date AS due_day
    FROM public.bu_owner_settlements s
    WHERE s.organization_id = p_organization_id
      AND s.status = 'pending'
      AND s.due_at IS NOT NULL
      AND (timezone('UTC', s.due_at))::date >= v_hist_from
      AND (timezone('UTC', s.due_at))::date <= v_fc_to
      AND (
        p_business_unit_id IS NULL
        OR s.business_unit_id = p_business_unit_id
      )
      AND (
        v_mode = 'org'
        OR (
          v_mode = 'head'
          AND s.owner_member_id = v_head_member_id
        )
      )
  ),
  team_sale_commissions AS (
    SELECT
      ss.id AS sale_id,
      COALESCE(SUM(c.commission_amount), 0)::bigint AS team_cents
    FROM scoped_sales ss
    LEFT JOIN public.commissions c
      ON c.organization_sale_id = ss.id
     AND c.status IS DISTINCT FROM 'canceled'::commission_status
    LEFT JOIN public.lead_attributions a
      ON a.id = c.attribution_id
    WHERE a.attribution_type IN ('closer', 'setter', 'ambassador')
    GROUP BY ss.id
  ),
  paid_commissions AS (
    SELECT
      c.id,
      c.commission_amount,
      c.paid_at,
      c.business_unit_id,
      COALESCE(
        a.attribution_type::text,
        CASE
          WHEN c.pool = 'acquisition'
           AND c.attribution_id IS NULL
           AND c.beneficiary_member_id IS NOT NULL
          THEN 'business_unit'
          ELSE NULL
        END
      ) AS attribution_type,
      COALESCE(a.member_id, c.beneficiary_member_id) AS attribution_member_id
    FROM public.commissions c
    LEFT JOIN public.lead_attributions a ON a.id = c.attribution_id
    WHERE c.organization_id = p_organization_id
      AND c.status = 'paid'::commission_status
      AND c.paid_at IS NOT NULL
      AND c.paid_at >= p_from
      AND c.paid_at <= p_to
      AND public.commission_in_scope(
        c.organization_id,
        c.business_unit_id,
        c.attribution_id,
        c.beneficiary_member_id
      )
      AND (
        p_business_unit_id IS NULL
        OR c.business_unit_id = p_business_unit_id
      )
  ),
  forecast_commissions AS (
    SELECT
      c.id,
      c.commission_amount,
      (timezone('UTC', c.due_at))::date AS due_day,
      COALESCE(
        a.attribution_type::text,
        CASE
          WHEN c.pool = 'acquisition'
           AND c.attribution_id IS NULL
           AND c.beneficiary_member_id IS NOT NULL
          THEN 'business_unit'
          ELSE NULL
        END
      ) AS attribution_type,
      COALESCE(a.member_id, c.beneficiary_member_id) AS attribution_member_id
    FROM public.commissions c
    LEFT JOIN public.lead_attributions a ON a.id = c.attribution_id
    WHERE c.organization_id = p_organization_id
      AND c.status = 'pending'::commission_status
      AND c.due_at IS NOT NULL
      AND (timezone('UTC', c.due_at))::date >= v_hist_from
      AND (timezone('UTC', c.due_at))::date <= v_fc_to
      AND public.commission_in_scope(
        c.organization_id,
        c.business_unit_id,
        c.attribution_id,
        c.beneficiary_member_id
      )
      AND (
        p_business_unit_id IS NULL
        OR c.business_unit_id = p_business_unit_id
      )
  ),
  series_paid AS (
    SELECT
      pc.commission_amount,
      pc.paid_at
    FROM paid_commissions pc
    WHERE v_mode = 'org'
      AND COALESCE(pc.attribution_type, '') IS DISTINCT FROM 'business_unit'
    UNION ALL
    SELECT
      ps.amount_cents AS commission_amount,
      ps.paid_at
    FROM paid_settlements ps
  ),
  series_forecast AS (
    SELECT
      fc.commission_amount,
      fc.due_day
    FROM forecast_commissions fc
    WHERE v_mode = 'org'
      AND COALESCE(fc.attribution_type, '') IS DISTINCT FROM 'business_unit'
    UNION ALL
    SELECT
      fs.amount_cents AS commission_amount,
      fs.due_day
    FROM forecast_settlements fs
  ),
  hist_buckets AS (
    SELECT
      CASE
        WHEN v_grain = 'month' THEN to_char(d, 'YYYY-MM')
        ELSE to_char(d, 'YYYY-MM-DD')
      END AS bucket,
      'history'::text AS zone
    FROM generate_series(
      CASE
        WHEN v_grain = 'month' THEN date_trunc('month', v_hist_from::timestamp)
        ELSE v_hist_from::timestamp
      END,
      CASE
        WHEN v_grain = 'month' THEN date_trunc('month', v_hist_to::timestamp)
        ELSE v_hist_to::timestamp
      END,
      CASE WHEN v_grain = 'month' THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END
    ) AS d
  ),
  fc_buckets AS (
    SELECT
      CASE
        WHEN v_grain = 'month' THEN to_char(d, 'YYYY-MM')
        ELSE to_char(d, 'YYYY-MM-DD')
      END AS bucket,
      'forecast'::text AS zone
    FROM generate_series(
      CASE
        WHEN v_grain = 'month' THEN date_trunc('month', v_fc_from::timestamp)
        ELSE v_fc_from::timestamp
      END,
      CASE
        WHEN v_grain = 'month' THEN date_trunc('month', v_fc_to::timestamp)
        ELSE v_fc_to::timestamp
      END,
      CASE WHEN v_grain = 'month' THEN INTERVAL '1 month' ELSE INTERVAL '1 day' END
    ) AS d
  ),
  all_buckets AS (
    SELECT * FROM hist_buckets
    UNION ALL
    SELECT * FROM fc_buckets
  ),
  paid_by_bucket AS (
    SELECT
      CASE
        WHEN v_grain = 'month'
          THEN to_char(date_trunc('month', timezone('UTC', pc.paid_at)), 'YYYY-MM')
        ELSE to_char((timezone('UTC', pc.paid_at))::date, 'YYYY-MM-DD')
      END AS bucket,
      SUM(pc.commission_amount)::bigint AS paid_cents
    FROM series_paid pc
    GROUP BY 1
  ),
  forecast_by_bucket AS (
    SELECT
      CASE
        WHEN v_grain = 'month' THEN to_char(date_trunc('month', fc.due_day::timestamp), 'YYYY-MM')
        ELSE to_char(fc.due_day, 'YYYY-MM-DD')
      END AS bucket,
      SUM(fc.commission_amount)::bigint AS forecast_cents
    FROM series_forecast fc
    GROUP BY 1
  ),
  kpi AS (
    SELECT
      (SELECT COUNT(*)::bigint FROM scoped_leads) AS leads,
      (SELECT COUNT(*)::bigint FROM scoped_leads WHERE status = 'converted') AS converted,
      (SELECT COALESCE(SUM(price), 0)::bigint FROM scoped_sales) AS revenue_cents,
      (
        (SELECT COALESCE(SUM(team_cents), 0)::bigint FROM team_sale_commissions)
        + (SELECT COALESCE(SUM(amount_cents), 0)::bigint FROM period_settlements)
      ) AS all_commissions_cents,
      (
        (
          SELECT COALESCE(SUM(pc.commission_amount), 0)::bigint
          FROM paid_commissions pc
          WHERE COALESCE(pc.attribution_type, '') IS DISTINCT FROM 'business_unit'
        )
        + (SELECT COALESCE(SUM(amount_cents), 0)::bigint FROM paid_settlements)
      ) AS all_commissions_paid_cents,
      (SELECT COALESCE(SUM(amount_cents), 0)::bigint FROM period_settlements) AS head_commissions_cents,
      (SELECT COALESCE(SUM(amount_cents), 0)::bigint FROM paid_settlements) AS head_commissions_paid_cents,
      (SELECT COALESCE(SUM(team_cents), 0)::bigint FROM team_sale_commissions) AS team_commissions_cents,
      (
        SELECT COALESCE(SUM(pc.commission_amount), 0)::bigint
        FROM paid_commissions pc
        WHERE pc.attribution_type IN ('closer', 'setter', 'ambassador')
      ) AS team_commissions_paid_cents
  ),
  series AS (
    SELECT
      COALESCE(
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
        (timezone('UTC', ss.sold_at))::date::text AS day,
        SUM(ss.price)::bigint AS revenue_cents
      FROM scoped_sales ss
      GROUP BY 1
    ) d
  ),
  commission_series AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'bucket', b.bucket,
            'zone', b.zone,
            'paid_cents', CASE
              WHEN b.zone = 'history' THEN COALESCE(p.paid_cents, 0)
              ELSE 0
            END,
            'forecast_cents', COALESCE(f.forecast_cents, 0)
          )
          ORDER BY b.bucket, b.zone
        ),
        '[]'::jsonb
      ) AS payload
    FROM all_buckets b
    LEFT JOIN paid_by_bucket p ON p.bucket = b.bucket AND b.zone = 'history'
    LEFT JOIN forecast_by_bucket f ON f.bucket = b.bucket
  ),
  member_names AS (
    SELECT
      om.id AS member_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), om.email, 'Member') AS member_name
    FROM public.organization_members om
    LEFT JOIN public.profiles p ON p.user_id = om.user_id
    WHERE om.organization_id = p_organization_id
  ),
  owner_stats AS (
    SELECT
      sl.owner_id AS member_id,
      'owner'::text AS role_kind,
      COUNT(*)::bigint AS leads,
      COUNT(*) FILTER (WHERE sl.status = 'converted')::bigint AS converted,
      COALESCE(SUM(ss.price), 0)::bigint AS revenue_cents
    FROM scoped_leads sl
    LEFT JOIN scoped_sales ss ON ss.id = sl.organization_sale_id
    WHERE sl.owner_id IS NOT NULL
    GROUP BY sl.owner_id
  ),
  attr_stats AS (
    SELECT
      a.member_id,
      a.attribution_type::text AS role_kind,
      COUNT(DISTINCT sl.id)::bigint AS leads,
      COUNT(DISTINCT sl.id) FILTER (WHERE sl.status = 'converted')::bigint AS converted,
      COALESCE(SUM(ss.price), 0)::bigint AS revenue_cents
    FROM scoped_leads sl
    JOIN public.lead_attributions a
      ON a.lead_id = sl.id
     AND a.attribution_type IN ('closer', 'setter')
    LEFT JOIN scoped_sales ss ON ss.id = sl.organization_sale_id
    WHERE a.member_id IS NOT NULL
    GROUP BY a.member_id, a.attribution_type
  ),
  members AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'member_id', m.member_id,
            'member_name', COALESCE(mn.member_name, 'Member'),
            'role_kind', m.role_kind,
            'leads', m.leads,
            'converted', m.converted,
            'conversion_rate',
              CASE
                WHEN m.leads > 0 THEN ROUND((m.converted::numeric / m.leads::numeric) * 100, 1)
                ELSE 0
              END,
            'revenue_cents', m.revenue_cents
          )
          ORDER BY m.revenue_cents DESC, mn.member_name ASC NULLS LAST, m.role_kind
        ),
        '[]'::jsonb
      ) AS payload
    FROM (
      SELECT * FROM owner_stats
      UNION ALL
      SELECT * FROM attr_stats
    ) m
    LEFT JOIN member_names mn ON mn.member_id = m.member_id
  ),
  packs AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'offer_id', p.offer_id,
            'offer_title', p.offer_title,
            'qty', p.qty,
            'revenue_cents', p.revenue_cents,
            'avg_price_cents', p.avg_price_cents
          )
          ORDER BY p.revenue_cents DESC, p.offer_title ASC NULLS LAST
        ),
        '[]'::jsonb
      ) AS payload
    FROM (
      SELECT
        ss.offer_id,
        COALESCE(MAX(ss.offer_title), 'Offer') AS offer_title,
        COUNT(*)::bigint AS qty,
        SUM(ss.price)::bigint AS revenue_cents,
        ROUND(AVG(ss.price))::bigint AS avg_price_cents
      FROM scoped_sales ss
      WHERE ss.offer_id IS NOT NULL
      GROUP BY ss.offer_id
    ) p
  ),
  bus AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'business_unit_id', b.business_unit_id,
            'name', b.name,
            'leads', b.leads,
            'converted', b.converted,
            'revenue_cents', b.revenue_cents,
            'commissions_cents', b.commissions_cents,
            'commissions_paid_cents', b.commissions_paid_cents,
            'margin_cents', b.revenue_cents - b.commissions_cents
          )
          ORDER BY b.revenue_cents DESC, b.name ASC
        ),
        '[]'::jsonb
      ) AS payload
    FROM (
      SELECT
        bu.id AS business_unit_id,
        bu.name,
        COALESCE(lc.leads, 0)::bigint AS leads,
        COALESCE(lc.converted, 0)::bigint AS converted,
        COALESCE(sc.revenue_cents, 0)::bigint AS revenue_cents,
        costs.commissions_cents::bigint AS commissions_cents,
        costs.commissions_paid_cents::bigint AS commissions_paid_cents
      FROM public.business_units bu
      LEFT JOIN (
        SELECT
          sl.business_unit_id,
          COUNT(*)::bigint AS leads,
          COUNT(*) FILTER (WHERE sl.status = 'converted')::bigint AS converted
        FROM scoped_leads sl
        WHERE sl.business_unit_id IS NOT NULL
        GROUP BY sl.business_unit_id
      ) lc ON lc.business_unit_id = bu.id
      LEFT JOIN (
        SELECT
          ss.sale_bu_id AS business_unit_id,
          SUM(ss.price)::bigint AS revenue_cents,
          COALESCE(SUM(tsc.team_cents), 0)::bigint AS team_commissions_cents
        FROM scoped_sales ss
        LEFT JOIN team_sale_commissions tsc ON tsc.sale_id = ss.id
        WHERE ss.sale_bu_id IS NOT NULL
        GROUP BY ss.sale_bu_id
      ) sc ON sc.business_unit_id = bu.id
      LEFT JOIN (
        SELECT
          ps.business_unit_id,
          SUM(ps.amount_cents)::bigint AS settlement_cents
        FROM period_settlements ps
        GROUP BY ps.business_unit_id
      ) st ON st.business_unit_id = bu.id
      LEFT JOIN (
        SELECT
          pc.business_unit_id,
          SUM(pc.commission_amount)::bigint AS team_paid_cents
        FROM paid_commissions pc
        WHERE pc.business_unit_id IS NOT NULL
          AND COALESCE(pc.attribution_type, '') IS DISTINCT FROM 'business_unit'
        GROUP BY pc.business_unit_id
      ) pc ON pc.business_unit_id = bu.id
      LEFT JOIN (
        SELECT
          ps.business_unit_id,
          SUM(ps.amount_cents)::bigint AS settlement_paid_cents
        FROM paid_settlements ps
        GROUP BY ps.business_unit_id
      ) psp ON psp.business_unit_id = bu.id
      CROSS JOIN LATERAL (
        SELECT
          COALESCE(sc.team_commissions_cents, 0) + COALESCE(st.settlement_cents, 0) AS commissions_cents,
          COALESCE(pc.team_paid_cents, 0) + COALESCE(psp.settlement_paid_cents, 0) AS commissions_paid_cents
      ) costs
      WHERE bu.organization_id = p_organization_id
        AND bu.status = 'active'
        AND v_mode = 'org'
        AND (
          p_business_unit_id IS NULL
          OR bu.id = p_business_unit_id
        )
        AND (
          COALESCE(lc.leads, 0) > 0
          OR COALESCE(sc.revenue_cents, 0) > 0
          OR costs.commissions_paid_cents > 0
          OR COALESCE(st.settlement_cents, 0) > 0
        )
    ) b
  ),
  funnel AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'status_key', f.key,
            'label', f.label,
            'count', f.count
          )
          ORDER BY f.position ASC, f.label ASC
        ),
        '[]'::jsonb
      ) AS payload
    FROM (
      SELECT
        ols.key,
        ols.label,
        ols.position,
        COUNT(sl.id)::bigint AS count
      FROM public.organization_lead_statuses ols
      LEFT JOIN scoped_leads sl ON sl.status = ols.key
      WHERE ols.organization_id = p_organization_id
      GROUP BY ols.key, ols.label, ols.position
    ) f
  )
  SELECT jsonb_build_object(
    'viewer_mode', v_mode,
    'kpis', jsonb_build_object(
      'leads', k.leads,
      'converted', k.converted,
      'conversion_rate',
        CASE
          WHEN k.leads > 0 THEN ROUND((k.converted::numeric / k.leads::numeric) * 100, 1)
          ELSE 0
        END,
      'revenue_cents', k.revenue_cents,
      'commissions_cents',
        CASE WHEN v_mode = 'head' THEN k.head_commissions_cents ELSE k.all_commissions_cents END,
      'commissions_paid_cents',
        CASE WHEN v_mode = 'head' THEN k.head_commissions_paid_cents ELSE k.all_commissions_paid_cents END,
      'margin_cents',
        CASE
          WHEN v_mode = 'head' THEN 0
          ELSE k.revenue_cents - k.all_commissions_cents
        END,
      'head_commissions_cents', k.head_commissions_cents,
      'head_commissions_paid_cents', k.head_commissions_paid_cents,
      'team_commissions_cents', k.team_commissions_cents,
      'team_commissions_paid_cents', k.team_commissions_paid_cents
    ),
    'revenue_series', s.payload,
    'commission_series', cs.payload,
    'members', m.payload,
    'packs', p.payload,
    'business_units', b.payload,
    'funnel', f.payload
  )
  INTO v_result
  FROM kpi k, series s, commission_series cs, members m, packs p, bus b, funnel f;

  RETURN COALESCE(v_result, v_empty);
END;
$function$;
