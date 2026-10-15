-- When completed coaching sessions reach offers.sessions_count,
-- set enrollments.status = 'completed' (and back to active if undone).
-- Keep completed packs visible in the member portal (v_coached_products).

ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_status_check;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status = ANY (ARRAY[
    'active'::text,
    'expired'::text,
    'cancelled'::text,
    'paused'::text,
    'completed'::text
  ]));

CREATE OR REPLACE FUNCTION public.sync_enrollment_coaching_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ep_id bigint;
  enr_id bigint;
  cur_status text;
  total int;
  done int;
BEGIN
  ep_id := COALESCE(NEW.enrollment_product_id, OLD.enrollment_product_id);
  IF ep_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT e.id, e.status, o.sessions_count
  INTO enr_id, cur_status, total
  FROM public.enrollment_products ep
  JOIN public.enrollments e ON e.id = ep.enrollment_id
  JOIN public.offers o ON o.id = e.offer_id
  WHERE ep.id = ep_id;

  IF enr_id IS NULL OR total IS NULL OR total <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only auto-toggle between active and completed (leave paused/expired alone).
  IF cur_status IS DISTINCT FROM 'active' AND cur_status IS DISTINCT FROM 'completed' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*)::integer
  INTO done
  FROM public.coaching_sessions cs
  WHERE cs.enrollment_product_id = ep_id
    AND cs.completed_at IS NOT NULL;

  IF done >= total AND cur_status = 'active' THEN
    UPDATE public.enrollments
    SET status = 'completed'
    WHERE id = enr_id;
  ELSIF done < total AND cur_status = 'completed' THEN
    UPDATE public.enrollments
    SET status = 'active'
    WHERE id = enr_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS coaching_sessions_sync_enrollment_completion
  ON public.coaching_sessions;

CREATE TRIGGER coaching_sessions_sync_enrollment_completion
AFTER INSERT OR UPDATE OF completed_at OR DELETE
ON public.coaching_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_enrollment_coaching_completion();

-- Backfill packs already at quota.
UPDATE public.enrollments e
SET status = 'completed'
WHERE e.status = 'active'
  AND EXISTS (
    SELECT 1
    FROM public.enrollment_products ep
    JOIN public.offers o ON o.id = e.offer_id
    WHERE ep.enrollment_id = e.id
      AND o.sessions_count IS NOT NULL
      AND o.sessions_count > 0
      AND (
        SELECT count(*)::integer
        FROM public.coaching_sessions cs
        WHERE cs.enrollment_product_id = ep.id
          AND cs.completed_at IS NOT NULL
      ) >= o.sessions_count
  );

-- Member portal: completed coaching packs stay accessible (read-only delivery).
CREATE OR REPLACE VIEW public.v_coached_products
WITH (security_invoker = true)
AS
SELECT e.user_id,
    COALESCE(client_pf.full_name, e.buyer_email, '—'::text) AS user_full_name,
    COALESCE(e.buyer_email, ''::text) AS user_mail,
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
    coach_pf.full_name AS coach_full_name,
    CASE
        WHEN p.type = 'course'::text THEN (
          SELECT count(*)::integer
          FROM product_module_items pmi
          JOIN product_modules pm ON pm.id = pmi.product_module_id
          WHERE pm.product_id = p.id
        )
        WHEN p.type = 'coaching'::text THEN o.sessions_count
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
LEFT JOIN profiles client_pf ON client_pf.user_id = e.user_id
LEFT JOIN coaching_assignments ca ON ca.enrollment_product_id = ep.id
LEFT JOIN organization_members om_coach ON om_coach.id = ca.organization_member_id
LEFT JOIN profiles coach_pf ON coach_pf.user_id = om_coach.user_id
WHERE (e.status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text]))
  AND org.deleted_at IS NULL
  AND (e.expires_at IS NULL OR e.expires_at > now());
