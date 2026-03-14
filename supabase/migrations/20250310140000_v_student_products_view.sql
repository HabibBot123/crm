-- View: products a student has access to, with organization and offer details
create or replace view public.v_coached_products as
select
  e.user_id,
  e.organization_id,
  org.name          as organization_name,
  org.slug          as organization_slug,

  e.id              as enrollment_id,
  e.offer_id,
  o.billing_type    as offer_billing_type,
  o.interval        as offer_interval,
  o.title           as offer_title,
  o.price           as offer_price,
  o.currency        as offer_currency,
  e.status          as enrollment_status,
  e.started_at,
  e.expires_at,

  p.id              as product_id,
  p.title           as product_title,
  p.type            as product_type,
  p.cover_image_url,
  p.status          as product_status
from public.enrollments e
join public.offers o
  on o.id = e.offer_id
join public.enrollment_products ep
  on ep.enrollment_id = e.id
join public.products p
  on p.id = ep.product_id
join public.organizations org
  on org.id = e.organization_id
where e.status in ('active', 'paused')
  and org.deleted_at is null;
