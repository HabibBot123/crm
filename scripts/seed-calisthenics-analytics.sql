-- Idempotent seed for org 1 "Coaching Calisthenics"
-- Marker emails: *@seed.calisthenics.test

DO $$
DECLARE
  v_org constant bigint := 1;
  v_owner constant bigint := 1;      -- Habib
  v_staff constant bigint := 4;      -- 1round
  v_sales constant bigint := 5;      -- Contact Gymer
  v_amb constant bigint := 6;        -- Coachstack
  v_bu_market constant bigint := 1;  -- Market Finance (Habib)
  v_bu_corp constant bigint := 2;    -- Corporate Finance (Gymer)
  v_form1 constant bigint := 1;
  v_form2 constant bigint := 2;
  v_link_tiktok constant bigint := 1;
  v_link_bon constant bigint := 2;
  v_link_li constant bigint := 3;
  v_offer_bundle constant bigint := 1;   -- 50000
  v_offer_solo constant bigint := 2;     -- 40000 archived
  v_offer_formation constant bigint := 3; -- 2999

  r record;
  v_lead_id bigint;
  v_enroll_id bigint;
  v_sale_id bigint;
  v_attr_closer bigint;
  v_attr_setter bigint;
  v_attr_amb bigint;
  v_attr_head bigint;
  v_price integer;
  v_closer_cents integer;
  v_setter_cents integer;
  v_amb_cents integer;
  v_head_cents integer;
  v_residual integer;
  v_head_rate numeric;
  v_head_member bigint;
  v_expires timestamptz;
  v_i integer := 0;
BEGIN
  -- ── Cleanup previous seed ──────────────────────────────────────────
  UPDATE public.leads
  SET organization_sale_id = NULL, enrollment_id = NULL
  WHERE organization_id = v_org
    AND email LIKE '%@seed.calisthenics.test';

  DELETE FROM public.commissions
  WHERE organization_id = v_org
    AND lead_id IN (
      SELECT id FROM public.leads
      WHERE organization_id = v_org AND email LIKE '%@seed.calisthenics.test'
    );

  DELETE FROM public.lead_attributions
  WHERE lead_id IN (
    SELECT id FROM public.leads
    WHERE organization_id = v_org AND email LIKE '%@seed.calisthenics.test'
  );

  DELETE FROM public.organization_sales
  WHERE organization_id = v_org
    AND buyer_email LIKE '%@seed.calisthenics.test';

  DELETE FROM public.enrollments
  WHERE organization_id = v_org
    AND buyer_email LIKE '%@seed.calisthenics.test';

  DELETE FROM public.leads
  WHERE organization_id = v_org
    AND email LIKE '%@seed.calisthenics.test';

  -- ── Share links: realistic click volume for marketing later ────────
  UPDATE public.crm_ambassador_links SET clicks_count = 186 WHERE id = v_link_tiktok;
  UPDATE public.crm_ambassador_links SET clicks_count = 74 WHERE id = v_link_bon;
  UPDATE public.crm_ambassador_links SET clicks_count = 142 WHERE id = v_link_li;

  -- ── Pipeline leads (no sale) for funnel + marketing ────────────────
  INSERT INTO public.leads (
    organization_id, form_id, full_name, email, phone, origin, status, status_at,
    owner_id, ambassador_link_id, business_unit_id, target_offer_id,
    created_by_member_id, created_at, updated_at
  ) VALUES
    (v_org, v_form1, 'Léa Durand', 'lea.durand@seed.calisthenics.test', '+33611000001', 'form', 'new', now() - interval '2 days',
     v_sales, v_link_tiktok, v_bu_market, v_offer_bundle, v_owner, now() - interval '2 days', now()),
    (v_org, v_form1, 'Tom Bernard', 'tom.bernard@seed.calisthenics.test', '+33611000002', 'form', 'new', now() - interval '5 days',
     v_sales, v_link_tiktok, v_bu_market, v_offer_formation, v_owner, now() - interval '5 days', now()),
    (v_org, v_form1, 'Nora Petit', 'nora.petit@seed.calisthenics.test', NULL, 'form', 'webinair', now() - interval '8 days',
     v_owner, v_link_tiktok, v_bu_market, v_offer_bundle, v_owner, now() - interval '10 days', now()),
    (v_org, v_form2, 'Yanis Moreau', 'yanis.moreau@seed.calisthenics.test', '+33611000004', 'form', 'deadline', now() - interval '12 days',
     v_sales, v_link_li, v_bu_corp, v_offer_bundle, v_amb, now() - interval '14 days', now()),
    (v_org, v_form2, 'Chloé Roux', 'chloe.roux@seed.calisthenics.test', NULL, 'form', 'free_giveaway', now() - interval '18 days',
     v_staff, v_link_li, v_bu_corp, v_offer_formation, v_amb, now() - interval '20 days', now()),
    (v_org, v_form1, 'Hugo Lambert', 'hugo.lambert@seed.calisthenics.test', '+33611000006', 'form', 'lost', now() - interval '25 days',
     v_sales, v_link_bon, NULL, v_offer_formation, v_staff, now() - interval '40 days', now()),
    (v_org, v_form1, 'Inès Garnier', 'ines.garnier@seed.calisthenics.test', NULL, 'form', 'lost', now() - interval '35 days',
     v_owner, v_link_tiktok, v_bu_market, v_offer_bundle, v_owner, now() - interval '50 days', now()),
    (v_org, v_form2, 'Maxime Faure', 'maxime.faure@seed.calisthenics.test', '+33611000008', 'form', 'new', now() - interval '1 day',
     v_sales, v_link_li, v_bu_corp, v_offer_bundle, v_amb, now() - interval '1 day', now()),
    (v_org, NULL, 'Sarah Blanc', 'sarah.blanc@seed.calisthenics.test', '+33611000009', 'manual', 'webinair', now() - interval '6 days',
     v_owner, NULL, v_bu_market, v_offer_solo, v_owner, now() - interval '7 days', now()),
    (v_org, v_form1, 'Enzo Girard', 'enzo.girard@seed.calisthenics.test', NULL, 'form', 'deadline', now() - interval '15 days',
     v_sales, v_link_bon, NULL, v_offer_formation, v_staff, now() - interval '16 days', now()),
    (v_org, v_form2, 'Camille Andre', 'camille.andre@seed.calisthenics.test', '+33611000011', 'form', 'new', now() - interval '3 days',
     v_staff, v_link_li, v_bu_corp, v_offer_formation, v_amb, now() - interval '3 days', now()),
    (v_org, v_form1, 'Paul Renard', 'paul.renard@seed.calisthenics.test', NULL, 'form', 'lost', now() - interval '60 days',
     v_sales, v_link_tiktok, v_bu_market, v_offer_bundle, v_owner, now() - interval '70 days', now());

  -- ── Converted deals (clients + sales + activated commissions) ──────
  FOR r IN
    SELECT * FROM (VALUES
      -- name, email, offer_id, price, sold_at, owner, closer, setter, amb, link, bu, source, pay_coms
      ('Marie Lefevre', 'marie.lefevre@seed.calisthenics.test', v_offer_bundle, 50000, '2026-02-12'::timestamptz, v_sales, v_sales, NULL::bigint, v_amb, v_link_li, v_bu_corp, 'manual', true),
      ('Julien Caron', 'julien.caron@seed.calisthenics.test', v_offer_bundle, 50000, '2026-02-28'::timestamptz, v_owner, v_sales, v_owner, v_amb, v_link_li, v_bu_corp, 'manual', true),
      ('Emma Roche', 'emma.roche@seed.calisthenics.test', v_offer_formation, 2999, '2026-03-05'::timestamptz, v_sales, v_sales, NULL::bigint, v_owner, v_link_tiktok, v_bu_market, 'stripe', true),
      ('Lucas Perrin', 'lucas.perrin@seed.calisthenics.test', v_offer_formation, 2999, '2026-03-18'::timestamptz, v_staff, v_sales, NULL::bigint, v_staff, v_link_bon, NULL::bigint, 'manual', true),
      ('Alice Marchand', 'alice.marchand@seed.calisthenics.test', v_offer_solo, 40000, '2026-03-22'::timestamptz, v_owner, v_owner, NULL::bigint, v_amb, v_link_li, v_bu_market, 'manual', true),
      ('Noah Dupuis', 'noah.dupuis@seed.calisthenics.test', v_offer_bundle, 50000, '2026-04-08'::timestamptz, v_sales, v_sales, v_owner, v_amb, v_link_li, v_bu_corp, 'stripe', true),
      ('Lena Colin', 'lena.colin@seed.calisthenics.test', v_offer_formation, 2999, '2026-04-21'::timestamptz, v_sales, v_sales, NULL::bigint, v_owner, v_link_tiktok, v_bu_market, 'manual', false),
      ('Adam Fontaine', 'adam.fontaine@seed.calisthenics.test', v_offer_bundle, 48000, '2026-05-03'::timestamptz, v_owner, v_sales, v_owner, NULL::bigint, NULL::bigint, v_bu_market, 'manual', true),
      ('Manon Vidal', 'manon.vidal@seed.calisthenics.test', v_offer_formation, 2999, '2026-05-19'::timestamptz, v_sales, v_sales, NULL::bigint, v_staff, v_link_bon, NULL::bigint, 'stripe', true),
      ('Theo Gauthier', 'theo.gauthier@seed.calisthenics.test', v_offer_bundle, 50000, '2026-06-02'::timestamptz, v_sales, v_sales, NULL::bigint, v_amb, v_link_li, v_bu_corp, 'manual', true),
      ('Clara Muller', 'clara.muller@seed.calisthenics.test', v_offer_formation, 2999, '2026-06-27'::timestamptz, v_owner, v_owner, NULL::bigint, v_owner, v_link_tiktok, v_bu_market, 'manual', true),
      ('Louis Picard', 'louis.picard@seed.calisthenics.test', v_offer_solo, 40000, '2026-07-09'::timestamptz, v_sales, v_sales, v_owner, v_amb, v_link_li, v_bu_corp, 'stripe', true),
      ('Zoe Brun', 'zoe.brun@seed.calisthenics.test', v_offer_bundle, 50000, '2026-07-21'::timestamptz, v_owner, v_sales, NULL::bigint, v_amb, v_link_li, v_bu_corp, 'manual', true),
      ('Nathan Roy', 'nathan.roy@seed.calisthenics.test', v_offer_formation, 2999, '2026-08-04'::timestamptz, v_sales, v_sales, NULL::bigint, v_staff, v_link_bon, NULL::bigint, 'manual', true),
      ('Eva Lemoine', 'eva.lemoine@seed.calisthenics.test', v_offer_bundle, 52000, '2026-08-18'::timestamptz, v_sales, v_sales, v_owner, v_amb, v_link_li, v_bu_corp, 'stripe', true),
      ('Arthur Meyer', 'arthur.meyer@seed.calisthenics.test', v_offer_formation, 2999, '2026-09-02'::timestamptz, v_owner, v_owner, NULL::bigint, v_owner, v_link_tiktok, v_bu_market, 'manual', true),
      ('Jade Bonnet', 'jade.bonnet@seed.calisthenics.test', v_offer_bundle, 50000, '2026-09-15'::timestamptz, v_sales, v_sales, NULL::bigint, v_amb, v_link_li, v_bu_corp, 'manual', true),
      ('Raphael Chevalier', 'raphael.chevalier@seed.calisthenics.test', v_offer_formation, 2999, '2026-09-28'::timestamptz, v_staff, v_sales, NULL::bigint, NULL::bigint, NULL::bigint, v_bu_market, 'manual', false),
      ('Lisa Guerin', 'lisa.guerin@seed.calisthenics.test', v_offer_bundle, 50000, '2026-10-03'::timestamptz, v_sales, v_sales, v_owner, v_amb, v_link_li, v_bu_corp, 'stripe', true),
      ('Ethan Robin', 'ethan.robin@seed.calisthenics.test', v_offer_formation, 2999, '2026-10-07'::timestamptz, v_owner, v_sales, NULL::bigint, v_owner, v_link_tiktok, v_bu_market, 'manual', true),
      ('Mia Schneider', 'mia.schneider@seed.calisthenics.test', v_offer_bundle, 50000, '2026-10-09'::timestamptz, v_sales, v_sales, NULL::bigint, v_amb, v_link_li, v_bu_corp, 'manual', true)
    ) AS t(
      full_name, email, offer_id, price, sold_at, owner_id, closer_id, setter_id,
      amb_id, link_id, bu_id, source, activate_coms
    )
  LOOP
    v_i := v_i + 1;
    v_price := r.price;
    v_closer_cents := round(v_price * 0.10);
    v_setter_cents := CASE WHEN r.setter_id IS NOT NULL THEN round(v_price * 0.05) ELSE 0 END;
    v_amb_cents := CASE WHEN r.amb_id IS NOT NULL THEN round(v_price * 0.10) ELSE 0 END;
    v_residual := v_price - v_closer_cents - v_setter_cents - v_amb_cents;

    IF r.bu_id = v_bu_market THEN
      v_head_rate := 0.25;
      v_head_member := v_owner;
    ELSIF r.bu_id = v_bu_corp THEN
      v_head_rate := 0.10;
      v_head_member := v_sales;
    ELSE
      v_head_rate := 0;
      v_head_member := NULL;
    END IF;
    v_head_cents := CASE WHEN v_head_member IS NOT NULL THEN round(v_residual * v_head_rate) ELSE 0 END;

    IF r.offer_id = v_offer_formation THEN
      v_expires := NULL;
    ELSIF r.offer_id = v_offer_solo THEN
      v_expires := r.sold_at + interval '2 months';
    ELSE
      v_expires := r.sold_at + interval '2 months';
    END IF;

    INSERT INTO public.leads (
      organization_id, form_id, full_name, email, phone, origin, status, status_at,
      owner_id, ambassador_link_id, business_unit_id, target_offer_id,
      created_by_member_id, sale_source, created_at, updated_at
    ) VALUES (
      v_org,
      CASE WHEN r.link_id = v_link_li THEN v_form2 WHEN r.link_id IS NOT NULL THEN v_form1 ELSE NULL END,
      r.full_name,
      r.email,
      '+33612' || lpad((100000 + v_i)::text, 6, '0'),
      CASE WHEN r.link_id IS NOT NULL THEN 'form'::lead_origin ELSE 'manual'::lead_origin END,
      'converted',
      r.sold_at - interval '3 days',
      r.owner_id,
      r.link_id,
      r.bu_id,
      r.offer_id,
      coalesce(r.owner_id, v_owner),
      CASE WHEN r.source = 'stripe' THEN 'platform' ELSE 'manual' END,
      r.sold_at - interval '12 days',
      r.sold_at
    )
    RETURNING id INTO v_lead_id;

    INSERT INTO public.enrollments (
      organization_id, offer_id, user_id, status, started_at, expires_at,
      buyer_email, buyer_name, created_at, updated_at
    ) VALUES (
      v_org, r.offer_id, NULL, 'active', r.sold_at, v_expires,
      r.email, r.full_name, r.sold_at, r.sold_at
    )
    RETURNING id INTO v_enroll_id;

    INSERT INTO public.organization_sales (
      organization_id, enrollment_id, user_id, buyer_email, billing_type, price, currency,
      source, sold_at, created_at, base_amount_cents, installment_index, installment_count
    ) VALUES (
      v_org, v_enroll_id, NULL, r.email, 'one_time', v_price, 'eur',
      r.source, r.sold_at, r.sold_at, v_price, 1, 1
    )
    RETURNING id INTO v_sale_id;

    UPDATE public.leads
    SET enrollment_id = v_enroll_id,
        organization_sale_id = v_sale_id,
        updated_at = r.sold_at
    WHERE id = v_lead_id;

    INSERT INTO public.lead_attributions (lead_id, member_id, attribution_type, commission_rate, commission_fixed)
    VALUES (v_lead_id, r.closer_id, 'closer', 10, NULL)
    RETURNING id INTO v_attr_closer;

    IF r.setter_id IS NOT NULL THEN
      INSERT INTO public.lead_attributions (lead_id, member_id, attribution_type, commission_rate, commission_fixed)
      VALUES (v_lead_id, r.setter_id, 'setter', 5, NULL)
      RETURNING id INTO v_attr_setter;
    ELSE
      v_attr_setter := NULL;
    END IF;

    IF r.amb_id IS NOT NULL THEN
      INSERT INTO public.lead_attributions (lead_id, member_id, attribution_type, commission_rate, commission_fixed)
      VALUES (v_lead_id, r.amb_id, 'ambassador', 10, NULL)
      RETURNING id INTO v_attr_amb;
    ELSE
      v_attr_amb := NULL;
    END IF;

    IF v_head_member IS NOT NULL AND r.bu_id IS NOT NULL THEN
      INSERT INTO public.lead_attributions (lead_id, member_id, attribution_type, commission_rate, commission_fixed)
      VALUES (v_lead_id, v_head_member, 'business_unit', v_head_rate * 100, NULL)
      RETURNING id INTO v_attr_head;
    ELSE
      v_attr_head := NULL;
    END IF;

    IF r.activate_coms THEN
      -- closer (delay 1 month per org plan)
      INSERT INTO public.commissions (
        organization_id, lead_id, enrollment_id, organization_sale_id, attribution_id,
        amount_paid, commission_amount, status, pool, installment_index, installment_count,
        business_unit_id, due_at, beneficiary_member_id, created_at,
        paid_at, paid_by
      ) VALUES (
        v_org, v_lead_id, v_enroll_id, v_sale_id, v_attr_closer,
        v_price, v_closer_cents,
        CASE WHEN r.sold_at < now() - interval '45 days' THEN 'paid'::commission_status ELSE 'pending'::commission_status END,
        'acquisition', 1, 1, r.bu_id, r.sold_at + interval '1 month', r.closer_id, r.sold_at,
        CASE WHEN r.sold_at < now() - interval '45 days' THEN r.sold_at + interval '35 days' ELSE NULL END,
        CASE WHEN r.sold_at < now() - interval '45 days' THEN v_owner ELSE NULL END
      );

      IF v_attr_setter IS NOT NULL AND v_setter_cents > 0 THEN
        INSERT INTO public.commissions (
          organization_id, lead_id, enrollment_id, organization_sale_id, attribution_id,
          amount_paid, commission_amount, status, pool, installment_index, installment_count,
          business_unit_id, due_at, beneficiary_member_id, created_at
        ) VALUES (
          v_org, v_lead_id, v_enroll_id, v_sale_id, v_attr_setter,
          v_price, v_setter_cents, 'pending', 'acquisition', 1, 1,
          r.bu_id, r.sold_at + interval '1 month', r.setter_id, r.sold_at
        );
      END IF;

      IF v_attr_amb IS NOT NULL AND v_amb_cents > 0 THEN
        INSERT INTO public.commissions (
          organization_id, lead_id, enrollment_id, organization_sale_id, attribution_id,
          amount_paid, commission_amount, status, pool, installment_index, installment_count,
          business_unit_id, due_at, beneficiary_member_id, created_at,
          paid_at, paid_by
        ) VALUES (
          v_org, v_lead_id, v_enroll_id, v_sale_id, v_attr_amb,
          v_price, v_amb_cents,
          CASE WHEN r.sold_at < now() - interval '30 days' THEN 'paid'::commission_status ELSE 'pending'::commission_status END,
          'acquisition', 1, 1, r.bu_id, r.sold_at, r.amb_id, r.sold_at,
          CASE WHEN r.sold_at < now() - interval '30 days' THEN r.sold_at + interval '10 days' ELSE NULL END,
          CASE WHEN r.sold_at < now() - interval '30 days' THEN v_owner ELSE NULL END
        );
      END IF;

      IF v_attr_head IS NOT NULL AND v_head_cents > 0 THEN
        INSERT INTO public.commissions (
          organization_id, lead_id, enrollment_id, organization_sale_id, attribution_id,
          amount_paid, commission_amount, status, pool, installment_index, installment_count,
          business_unit_id, due_at, beneficiary_member_id, created_at
        ) VALUES (
          v_org, v_lead_id, v_enroll_id, v_sale_id, v_attr_head,
          v_price, v_head_cents, 'pending', 'acquisition', 1, 1,
          r.bu_id, r.sold_at, v_head_member, r.sold_at
        );
      END IF;

      UPDATE public.leads
      SET commissions_activated_at = r.sold_at + interval '1 hour',
          commissions_activated_by = v_owner,
          updated_at = r.sold_at + interval '1 hour'
      WHERE id = v_lead_id;
    END IF;
  END LOOP;
END $$;
