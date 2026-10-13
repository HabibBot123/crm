-- settle_bu_owner_month: monthly BU Owner settlements
-- Residual = CA − acquisition (sold_at) − delivery coach (created_at, BU via pack offer)
-- Applied via Supabase migration; keep this file as source of truth in repo.

CREATE OR REPLACE FUNCTION public.settle_bu_owner_month(
  p_year integer,
  p_month integer,
  p_organization_id bigint DEFAULT NULL::bigint
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_period_start date;
  v_period_end date;
  v_due_at timestamptz;
  v_created integer := 0;
  r record;
  v_revenue bigint;
  v_team bigint;
  v_delivery bigint;
  v_costs bigint;
  v_basis bigint;
  v_amount bigint;
  v_rate numeric;
BEGIN
  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid year/month';
  END IF;

  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  FOR r IN
    SELECT
      bu.id AS business_unit_id,
      bu.organization_id,
      bu.owner_member_id,
      bu.settlement_basis,
      bu.default_commission_rate,
      bu.default_commission_fixed,
      bu.payout_delay_months
    FROM public.business_units bu
    WHERE bu.status = 'active'
      AND bu.owner_member_id IS NOT NULL
      AND (p_organization_id IS NULL OR bu.organization_id = p_organization_id)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.bu_owner_settlements s
      WHERE s.business_unit_id = r.business_unit_id
        AND s.period_start = v_period_start
        AND s.period_end = v_period_end
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(s.price), 0)::bigint
    INTO v_revenue
    FROM public.organization_sales s
    JOIN public.enrollments e ON e.id = s.enrollment_id
    JOIN public.offers o ON o.id = e.offer_id
    WHERE s.organization_id = r.organization_id
      AND o.business_unit_id = r.business_unit_id
      AND (timezone('UTC', s.sold_at))::date >= v_period_start
      AND (timezone('UTC', s.sold_at))::date <= v_period_end;

    SELECT v_revenue + COALESCE(SUM(s.price), 0)::bigint
    INTO v_revenue
    FROM public.organization_sales s
    JOIN public.leads l ON l.organization_sale_id = s.id AND l.organization_id = s.organization_id
    JOIN public.offers o ON o.id = l.target_offer_id
    WHERE s.organization_id = r.organization_id
      AND s.enrollment_id IS NULL
      AND o.business_unit_id = r.business_unit_id
      AND (timezone('UTC', s.sold_at))::date >= v_period_start
      AND (timezone('UTC', s.sold_at))::date <= v_period_end;

    SELECT COALESCE(SUM(c.commission_amount), 0)::bigint
    INTO v_team
    FROM public.commissions c
    JOIN public.lead_attributions a ON a.id = c.attribution_id
    JOIN public.organization_sales s ON s.id = c.organization_sale_id
    LEFT JOIN public.enrollments e ON e.id = s.enrollment_id
    LEFT JOIN public.offers o_enroll ON o_enroll.id = e.offer_id
    LEFT JOIN public.leads l ON l.organization_sale_id = s.id AND l.organization_id = s.organization_id
    LEFT JOIN public.offers o_lead ON o_lead.id = l.target_offer_id
    WHERE c.organization_id = r.organization_id
      AND c.pool = 'acquisition'
      AND c.status IS DISTINCT FROM 'canceled'
      AND a.attribution_type IN ('closer', 'setter', 'ambassador')
      AND COALESCE(o_enroll.business_unit_id, o_lead.business_unit_id) = r.business_unit_id
      AND (timezone('UTC', s.sold_at))::date >= v_period_start
      AND (timezone('UTC', s.sold_at))::date <= v_period_end;

    SELECT COALESCE(SUM(c.commission_amount), 0)::bigint
    INTO v_delivery
    FROM public.commissions c
    JOIN public.organization_sales s ON s.id = c.organization_sale_id
    LEFT JOIN public.enrollments e ON e.id = COALESCE(c.enrollment_id, s.enrollment_id)
    LEFT JOIN public.offers o ON o.id = e.offer_id
    WHERE c.organization_id = r.organization_id
      AND c.pool = 'delivery'
      AND c.status IS DISTINCT FROM 'canceled'
      AND o.business_unit_id = r.business_unit_id
      AND (timezone('UTC', c.created_at))::date >= v_period_start
      AND (timezone('UTC', c.created_at))::date <= v_period_end;

    v_costs := COALESCE(v_team, 0) + COALESCE(v_delivery, 0);

    IF r.settlement_basis = 'of_residual' THEN
      v_basis := GREATEST(0, v_revenue - v_costs);
    ELSE
      v_basis := v_revenue;
    END IF;

    v_rate := r.default_commission_rate;
    IF r.default_commission_fixed IS NOT NULL AND r.default_commission_fixed > 0 THEN
      v_amount := ROUND(r.default_commission_fixed)::bigint;
    ELSIF v_rate IS NOT NULL AND v_rate > 0 THEN
      v_amount := ROUND((v_basis * v_rate) / 100.0)::bigint;
    ELSE
      v_amount := 0;
    END IF;

    IF v_amount <= 0 AND v_revenue <= 0 THEN
      CONTINUE;
    END IF;

    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    v_due_at := (
      (v_period_start + INTERVAL '1 month')
      + make_interval(months => COALESCE(r.payout_delay_months, 0))
    )::timestamptz;

    INSERT INTO public.bu_owner_settlements (
      organization_id,
      business_unit_id,
      owner_member_id,
      period_start,
      period_end,
      settlement_basis,
      commission_rate,
      revenue_cents,
      team_costs_cents,
      basis_cents,
      amount_cents,
      status,
      due_at
    ) VALUES (
      r.organization_id,
      r.business_unit_id,
      r.owner_member_id,
      v_period_start,
      v_period_end,
      r.settlement_basis,
      v_rate,
      v_revenue,
      v_costs,
      v_basis,
      v_amount,
      'pending',
      v_due_at
    );

    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$function$;
