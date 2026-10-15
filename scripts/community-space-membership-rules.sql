-- Offer → space membership rules + manual add/remove.
-- Empty rules = all living enrollments. remove_on_expire per rule.
-- Caps community.* stay capability-based (no auto staff rows).
-- Manual remove = soft left_at; sync may re-add if still enrollment-eligible (option A).

create table if not exists public.community_space_membership_rules (
  id bigint generated always as identity primary key,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  organization_id bigint not null references public.organizations (id),
  offer_id bigint not null references public.offers (id) on delete cascade,
  remove_on_expire boolean not null default true,
  created_at timestamptz not null default now(),
  constraint community_space_membership_rules_space_offer_uidx unique (space_id, offer_id)
);

create index if not exists community_space_membership_rules_space_idx
  on public.community_space_membership_rules (space_id);
create index if not exists community_space_membership_rules_offer_idx
  on public.community_space_membership_rules (offer_id);

alter table public.community_space_membership_rules enable row level security;

drop policy if exists community_space_membership_rules_select on public.community_space_membership_rules;
create policy community_space_membership_rules_select
  on public.community_space_membership_rules
  for select
  to authenticated
  using (
    public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
    or public.has_org_capability(organization_id, 'community.view_stats')
  );

drop policy if exists community_space_membership_rules_write on public.community_space_membership_rules;
create policy community_space_membership_rules_write
  on public.community_space_membership_rules
  for all
  to authenticated
  using (public.has_org_capability(organization_id, 'community.manage'))
  with check (public.has_org_capability(organization_id, 'community.manage'));

create or replace function public.sync_community_space_members_from_enrollments_internal(p_space_id bigint)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id bigint;
  v_joined integer := 0;
  v_has_rules boolean;
begin
  select s.organization_id into v_org_id
  from public.community_spaces s
  where s.id = p_space_id
    and s.archived_at is null;

  if v_org_id is null then
    return 0;
  end if;

  select exists (
    select 1 from public.community_space_membership_rules r where r.space_id = p_space_id
  ) into v_has_rules;

  with should_be as (
    select distinct e.user_id
    from public.enrollments e
    where e.organization_id = v_org_id
      and e.user_id is not null
      and e.status in ('active', 'paused')
      and (
        not v_has_rules
        or exists (
          select 1
          from public.community_space_membership_rules r
          where r.space_id = p_space_id
            and r.offer_id = e.offer_id
        )
      )
    union
    select distinct e.user_id
    from public.enrollments e
    join public.community_space_membership_rules r
      on r.offer_id = e.offer_id
     and r.space_id = p_space_id
    where v_has_rules
      and e.organization_id = v_org_id
      and e.user_id is not null
      and r.remove_on_expire = false
      and e.status not in ('active', 'paused')
  ),
  upserted as (
    insert into public.community_space_members (space_id, organization_id, user_id, role, source)
    select p_space_id, v_org_id, s.user_id, 'member', 'enrollment_sync'
    from should_be s
    on conflict (space_id, user_id) do update
      set left_at = null,
          source = case
            when community_space_members.source = 'staff'
              and community_space_members.left_at is null
              then 'staff'
            when community_space_members.source = 'manual'
              and community_space_members.left_at is null
              then 'manual'
            when community_space_members.source = 'staff'
              then 'staff'
            else 'enrollment_sync'
          end
    where community_space_members.left_at is not null
       or community_space_members.source = 'enrollment_sync'
    returning 1
  )
  select count(*)::integer into v_joined from upserted;

  update public.community_space_members m
  set left_at = now()
  where m.space_id = p_space_id
    and m.left_at is null
    and m.source = 'enrollment_sync'
    and not exists (
      select 1
      from public.enrollments e
      where e.organization_id = v_org_id
        and e.user_id = m.user_id
        and e.status in ('active', 'paused')
        and (
          not v_has_rules
          or exists (
            select 1
            from public.community_space_membership_rules r
            where r.space_id = p_space_id
              and r.offer_id = e.offer_id
          )
        )
    )
    and not exists (
      select 1
      from public.enrollments e
      join public.community_space_membership_rules r
        on r.offer_id = e.offer_id
       and r.space_id = p_space_id
      where v_has_rules
        and e.organization_id = v_org_id
        and e.user_id = m.user_id
        and r.remove_on_expire = false
        and e.status not in ('active', 'paused')
    );

  return coalesce(v_joined, 0);
end;
$$;

create or replace function public.sync_community_space_members_from_enrollments(p_space_id bigint)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id bigint;
begin
  select s.organization_id into v_org_id
  from public.community_spaces s
  where s.id = p_space_id;

  if v_org_id is null then
    raise exception 'Space not found';
  end if;
  if not public.has_org_capability(v_org_id, 'community.manage') then
    raise exception 'Missing capability community.manage';
  end if;

  return public.sync_community_space_members_from_enrollments_internal(p_space_id);
end;
$$;

drop function if exists public.create_community_space(bigint, text, text, boolean);
drop function if exists public.create_community_space(bigint, text, text, boolean, jsonb);

create or replace function public.create_community_space(
  p_organization_id bigint,
  p_name text,
  p_description text default null,
  p_sync_clients boolean default true,
  p_offer_rules jsonb default '[]'::jsonb
)
returns public.community_spaces
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_space public.community_spaces;
  v_slug text;
  v_base text;
  v_i int := 0;
  r jsonb;
  v_offer_id bigint;
  v_remove boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.has_org_capability(p_organization_id, 'community.manage') then
    raise exception 'Missing capability community.manage';
  end if;

  v_base := public.community_slugify(p_name);
  v_slug := v_base;
  while exists (
    select 1 from public.community_spaces s
    where s.organization_id = p_organization_id and s.slug = v_slug
  ) loop
    v_i := v_i + 1;
    v_slug := left(v_base, 50) || '-' || v_i::text;
  end loop;

  insert into public.community_spaces (organization_id, name, slug, description)
  values (
    p_organization_id,
    trim(p_name),
    v_slug,
    nullif(trim(coalesce(p_description, '')), '')
  )
  returning * into v_space;

  insert into public.community_feeds (space_id, organization_id, name, slug, sort_order, who_can_post)
  values
    (v_space.id, p_organization_id, 'Announcements', 'annonces', 0, 'admins'),
    (v_space.id, p_organization_id, 'General', 'general', 1, 'all');

  insert into public.community_space_members (space_id, organization_id, user_id, role, source)
  values (v_space.id, p_organization_id, auth.uid(), 'admin', 'staff')
  on conflict (space_id, user_id) do update
    set left_at = null,
        role = excluded.role,
        source = excluded.source;

  if p_offer_rules is not null and jsonb_typeof(p_offer_rules) = 'array' then
    for r in select * from jsonb_array_elements(p_offer_rules)
    loop
      begin
        v_offer_id := (r->>'offer_id')::bigint;
      exception when others then
        continue;
      end;
      if v_offer_id is null then
        continue;
      end if;
      v_remove := coalesce((r->>'remove_on_expire')::boolean, true);
      if not exists (
        select 1 from public.offers o
        where o.id = v_offer_id
          and o.organization_id = p_organization_id
      ) then
        raise exception 'Offer % not in organization', v_offer_id;
      end if;
      insert into public.community_space_membership_rules (
        space_id, organization_id, offer_id, remove_on_expire
      )
      values (v_space.id, p_organization_id, v_offer_id, v_remove)
      on conflict (space_id, offer_id) do update
        set remove_on_expire = excluded.remove_on_expire;
    end loop;
  end if;

  if p_sync_clients then
    perform public.sync_community_space_members_from_enrollments_internal(v_space.id);
  end if;

  return v_space;
end;
$$;

create or replace function public.add_community_space_member(
  p_space_id bigint,
  p_user_id uuid
)
returns public.community_space_members
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id bigint;
  v_row public.community_space_members;
  v_ok boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select s.organization_id into v_org_id
  from public.community_spaces s
  where s.id = p_space_id
    and s.archived_at is null;

  if v_org_id is null then
    raise exception 'Space not found';
  end if;
  if not public.has_org_capability(v_org_id, 'community.manage') then
    raise exception 'Missing capability community.manage';
  end if;

  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_org_id
      and om.user_id = p_user_id
      and om.status = 'active'
  ) into v_ok;

  if not v_ok then
    select exists (
      select 1
      from public.enrollments e
      where e.organization_id = v_org_id
        and e.user_id = p_user_id
        and e.status in ('active', 'paused')
    ) into v_ok;
  end if;

  if not v_ok then
    raise exception 'User must be an org member or living enrollment client';
  end if;

  insert into public.community_space_members (
    space_id, organization_id, user_id, role, source, left_at
  )
  values (p_space_id, v_org_id, p_user_id, 'member', 'manual', null)
  on conflict (space_id, user_id) do update
    set left_at = null,
        source = case
          when community_space_members.source = 'staff' then 'staff'
          else 'manual'
        end,
        role = case
          when community_space_members.source = 'staff' then community_space_members.role
          else 'member'
        end
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.remove_community_space_member(
  p_space_id bigint,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select s.organization_id into v_org_id
  from public.community_spaces s
  where s.id = p_space_id;

  if v_org_id is null then
    raise exception 'Space not found';
  end if;
  if not public.has_org_capability(v_org_id, 'community.manage') then
    raise exception 'Missing capability community.manage';
  end if;

  update public.community_space_members
  set left_at = now()
  where space_id = p_space_id
    and user_id = p_user_id
    and left_at is null;
end;
$$;

create or replace function public.enrollments_sync_community_spaces()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_org_id bigint;
  r record;
begin
  v_org_id := coalesce(NEW.organization_id, OLD.organization_id);
  if v_org_id is null then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'UPDATE'
     and NEW.status is not distinct from OLD.status
     and NEW.user_id is not distinct from OLD.user_id
     and NEW.offer_id is not distinct from OLD.offer_id then
    return NEW;
  end if;

  for r in
    select s.id
    from public.community_spaces s
    where s.organization_id = v_org_id
      and s.archived_at is null
  loop
    perform public.sync_community_space_members_from_enrollments_internal(r.id);
  end loop;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists enrollments_sync_community_spaces on public.enrollments;
create trigger enrollments_sync_community_spaces
after insert or update of status, user_id, offer_id
on public.enrollments
for each row
execute function public.enrollments_sync_community_spaces();

revoke all on function public.create_community_space(bigint, text, text, boolean, jsonb) from public;
revoke all on function public.sync_community_space_members_from_enrollments(bigint) from public;
revoke all on function public.sync_community_space_members_from_enrollments_internal(bigint) from public;
revoke all on function public.add_community_space_member(bigint, uuid) from public;
revoke all on function public.remove_community_space_member(bigint, uuid) from public;

grant execute on function public.create_community_space(bigint, text, text, boolean, jsonb) to authenticated;
grant execute on function public.sync_community_space_members_from_enrollments(bigint) to authenticated;
grant execute on function public.add_community_space_member(bigint, uuid) to authenticated;
grant execute on function public.remove_community_space_member(bigint, uuid) to authenticated;
