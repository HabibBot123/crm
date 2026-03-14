create view public.v_coached_products as
select
  e.user_id,
  e.organization_id,
  org.name as organization_name,
  org.slug as organization_slug,
  e.id as enrollment_id,
  ep.id as enrollment_product_id,
  e.offer_id,
  o.billing_type as offer_billing_type,
  o."interval" as offer_interval,
  o.title as offer_title,
  o.price as offer_price,
  o.currency as offer_currency,
  e.status as enrollment_status,
  e.started_at,
  e.expires_at,
  p.id as product_id,
  p.title as product_title,
  p.type as product_type,
  p.cover_image_url,
  case
    when p.type = 'course'::text then (
      select
        count(*)::integer as count
      from
        product_module_items pmi
        join product_modules pm on pm.id = pmi.product_module_id
      where
        pm.product_id = p.id
    )
    else null::integer
  end as completion_total,
  case
    when p.type = 'course'::text then (
      select
        count(*)::integer as count
      from
        course_lesson_progress clp
        join product_module_items pmi on pmi.id = clp.product_module_item_id
        join product_modules pm on pm.id = pmi.product_module_id
      where
        pm.product_id = p.id
        and clp.user_id = e.user_id
        and clp.enrollment_product_id = ep.id
        and clp.completed_at is not null
    )
    else null::integer
  end as completion_completed
from
  enrollments e
  join offers o on o.id = e.offer_id
  join enrollment_products ep on ep.enrollment_id = e.id
  join products p on p.id = ep.product_id
  join organizations org on org.id = e.organization_id
where
  (
    e.status = any (array['active'::text, 'paused'::text])
  )
  and org.deleted_at is null;