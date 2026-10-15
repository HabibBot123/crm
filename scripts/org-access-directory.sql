-- Admin org directory (community.manage). Union staff + enrollments + space members.
create or replace function public.org_access_directory_page(
  p_organization_id bigint,
  p_q text default null,
  p_origin text default null,
  p_limit int default 25,
  p_offset int default 0,
  p_origins text[] default null
)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  origins text[],
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 25), 100));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_origins text[] := coalesce(
    nullif(p_origins, '{}'::text[]),
    case when nullif(trim(coalesce(p_origin, '')), '') is null then null
         else array[trim(p_origin)]
    end
  );
begin
  if not public.has_org_capability(p_organization_id, 'community.manage') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with staff as (
    select om.user_id, om.email::text as email, 'staff'::text as origin
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id is not null
  ),
  enrolled as (
    select e.user_id, e.buyer_email::text as email, 'enrollment'::text as origin
    from public.enrollments e
    where e.organization_id = p_organization_id
      and e.status in ('active', 'paused')
      and e.user_id is not null
  ),
  space_m as (
    select m.user_id, null::text as email, 'community'::text as origin
    from public.community_space_members m
    where m.organization_id = p_organization_id
      and m.left_at is null
  ),
  unioned as (
    select * from staff
    union all
    select * from enrolled
    union all
    select * from space_m
  ),
  agg as (
    select
      u.user_id,
      array_agg(distinct u.origin order by u.origin) as origins,
      max(u.email) filter (where u.email is not null and length(trim(u.email)) > 0) as email
    from unioned u
    group by u.user_id
  ),
  filtered as (
    select
      a.user_id,
      p.full_name,
      p.avatar_url,
      a.email,
      a.origins
    from agg a
    left join public.profiles p on p.user_id = a.user_id
    where (v_origins is null or a.origins && v_origins)
      and (
        v_q is null
        or coalesce(p.full_name, '') ilike '%' || v_q || '%'
        or coalesce(a.email, '') ilike '%' || v_q || '%'
      )
  )
  select
    f.user_id,
    f.full_name,
    f.avatar_url,
    f.email,
    f.origins,
    count(*) over ()::bigint as total_count
  from filtered f
  order by lower(coalesce(f.full_name, f.email, f.user_id::text))
  limit v_limit
  offset v_offset;
end;
$$;

drop function if exists public.org_access_directory_page(bigint, text, text, int, int);

revoke all on function public.org_access_directory_page(bigint, text, text, int, int, text[]) from public;
grant execute on function public.org_access_directory_page(bigint, text, text, int, int, text[]) to authenticated;
