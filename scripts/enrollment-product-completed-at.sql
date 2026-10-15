-- Product-level delivery completion on enrollment_products.completed_at.
-- Enrollment.status stays commercial (active/paused/expired/cancelled).

ALTER TABLE public.enrollment_products
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

COMMENT ON COLUMN public.enrollment_products.completed_at IS
  'Set when this product line quota is fully delivered (all lessons or coaching sessions).';

-- Reopen enrollments wrongly marked completed by the old enrollment-level sync.
UPDATE public.enrollments
SET status = 'active'
WHERE status = 'completed'
  AND (expires_at IS NULL OR expires_at > now());

CREATE OR REPLACE FUNCTION public.sync_enrollment_product_completion(p_ep_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_type text;
  product_id bigint;
  sessions_count integer;
  total integer;
  done integer;
  cur_completed_at timestamptz;
BEGIN
  SELECT p.type, p.id, o.sessions_count, ep.completed_at
  INTO product_type, product_id, sessions_count, cur_completed_at
  FROM public.enrollment_products ep
  JOIN public.products p ON p.id = ep.product_id
  JOIN public.enrollments e ON e.id = ep.enrollment_id
  JOIN public.offers o ON o.id = e.offer_id
  WHERE ep.id = p_ep_id;

  IF product_type IS NULL THEN
    RETURN;
  END IF;

  IF product_type = 'coaching' THEN
    total := sessions_count;
    IF total IS NULL OR total <= 0 THEN
      RETURN;
    END IF;
    SELECT count(*)::integer
    INTO done
    FROM public.coaching_sessions cs
    WHERE cs.enrollment_product_id = p_ep_id
      AND cs.completed_at IS NOT NULL;
  ELSIF product_type = 'course' THEN
    SELECT count(*)::integer
    INTO total
    FROM public.product_module_items pmi
    JOIN public.product_modules pm ON pm.id = pmi.product_module_id
    WHERE pm.product_id = product_id;
    IF total IS NULL OR total <= 0 THEN
      RETURN;
    END IF;
    SELECT count(*)::integer
    INTO done
    FROM public.course_lesson_progress clp
    WHERE clp.enrollment_product_id = p_ep_id
      AND clp.completed_at IS NOT NULL;
  ELSE
    RETURN;
  END IF;

  IF done >= total AND cur_completed_at IS NULL THEN
    UPDATE public.enrollment_products
    SET completed_at = now()
    WHERE id = p_ep_id;
  ELSIF done < total AND cur_completed_at IS NOT NULL THEN
    UPDATE public.enrollment_products
    SET completed_at = NULL
    WHERE id = p_ep_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_enrollment_coaching_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ep_id bigint;
BEGIN
  ep_id := COALESCE(NEW.enrollment_product_id, OLD.enrollment_product_id);
  IF ep_id IS NOT NULL THEN
    PERFORM public.sync_enrollment_product_completion(ep_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_enrollment_course_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ep_id bigint;
BEGIN
  ep_id := COALESCE(NEW.enrollment_product_id, OLD.enrollment_product_id);
  IF ep_id IS NOT NULL THEN
    PERFORM public.sync_enrollment_product_completion(ep_id);
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

DROP TRIGGER IF EXISTS course_lesson_progress_sync_enrollment_completion
  ON public.course_lesson_progress;
CREATE TRIGGER course_lesson_progress_sync_enrollment_completion
AFTER INSERT OR UPDATE OF completed_at OR DELETE
ON public.course_lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_enrollment_course_completion();

-- Backfill product completed_at from current progress.
UPDATE public.enrollment_products ep
SET completed_at = now()
FROM public.products p,
     public.enrollments e,
     public.offers o
WHERE ep.product_id = p.id
  AND e.id = ep.enrollment_id
  AND o.id = e.offer_id
  AND ep.completed_at IS NULL
  AND (
    (
      p.type = 'coaching'
      AND o.sessions_count IS NOT NULL
      AND o.sessions_count > 0
      AND (
        SELECT count(*)::integer
        FROM public.coaching_sessions cs
        WHERE cs.enrollment_product_id = ep.id
          AND cs.completed_at IS NOT NULL
      ) >= o.sessions_count
    )
    OR (
      p.type = 'course'
      AND (
        SELECT count(*)::integer
        FROM public.product_module_items pmi
        JOIN public.product_modules pm ON pm.id = pmi.product_module_id
        WHERE pm.product_id = p.id
      ) > 0
      AND (
        SELECT count(*)::integer
        FROM public.course_lesson_progress clp
        WHERE clp.enrollment_product_id = ep.id
          AND clp.completed_at IS NOT NULL
      ) >= (
        SELECT count(*)::integer
        FROM public.product_module_items pmi
        JOIN public.product_modules pm ON pm.id = pmi.product_module_id
        WHERE pm.product_id = p.id
      )
    )
  );

-- Drop obsolete enrollment-level helper if present.
DROP FUNCTION IF EXISTS public.sync_enrollment_delivery_completion(bigint);

-- Portal view: living enrollments only + product_completed_at.
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
    END AS completion_completed,
    ep.completed_at AS product_completed_at
FROM enrollments e
JOIN offers o ON o.id = e.offer_id
JOIN enrollment_products ep ON ep.enrollment_id = e.id
JOIN products p ON p.id = ep.product_id
JOIN organizations org ON org.id = e.organization_id
LEFT JOIN profiles client_pf ON client_pf.user_id = e.user_id
LEFT JOIN coaching_assignments ca ON ca.enrollment_product_id = ep.id
LEFT JOIN organization_members om_coach ON om_coach.id = ca.organization_member_id
LEFT JOIN profiles coach_pf ON coach_pf.user_id = om_coach.user_id
WHERE (e.status = ANY (ARRAY['active'::text, 'paused'::text]))
  AND org.deleted_at IS NULL
  AND (e.expires_at IS NULL OR e.expires_at > now());

-- Ops coaching packs view: expose product_completed_at (appended).
CREATE OR REPLACE VIEW public.v_coaching_packs
WITH (security_invoker = true)
AS
SELECT e.user_id,
    COALESCE(client_pf.full_name, e.buyer_name, e.buyer_email, 'Unknown'::text) AS user_full_name,
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
    o.sessions_count AS completion_total,
    (
      SELECT count(*)::integer
      FROM coaching_sessions cs
      WHERE cs.enrollment_product_id = ep.id
        AND cs.completed_at IS NOT NULL
    ) AS completion_completed,
    ep.completed_at AS product_completed_at
FROM enrollments e
JOIN offers o ON o.id = e.offer_id
JOIN enrollment_products ep ON ep.enrollment_id = e.id
JOIN products p ON p.id = ep.product_id
JOIN organizations org ON org.id = e.organization_id
LEFT JOIN profiles client_pf ON client_pf.user_id = e.user_id
LEFT JOIN coaching_assignments ca ON ca.enrollment_product_id = ep.id
LEFT JOIN organization_members om_coach ON om_coach.id = ca.organization_member_id
LEFT JOIN profiles coach_pf ON coach_pf.user_id = om_coach.user_id
WHERE p.type = 'coaching'::text
  AND org.deleted_at IS NULL;
