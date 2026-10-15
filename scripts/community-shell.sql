-- Community shell V1: spaces, members, feeds, caps community.*
-- Applied via Supabase MCP (crmsport) 2026-10-15.

-- ---------------------------------------------------------------------------
-- Caps: community.manage | community.moderate | community.view_stats
-- ---------------------------------------------------------------------------

alter table public.organization_role_permissions
  drop constraint if exists organization_role_permissions_capability_check;

alter table public.organization_role_permissions
  add constraint organization_role_permissions_capability_check
  check (capability = any (array[
    'team.invite'::text,
    'team.manage_roles'::text,
    'team.revoke'::text,
    'catalog.manage'::text,
    'clients.view'::text,
    'clients.enroll_manual'::text,
    'sales.view'::text,
    'analytics.view'::text,
    'crm.leads.view'::text,
    'crm.leads.view_own'::text,
    'crm.leads.update_status'::text,
    'crm.leads.edit'::text,
    'crm.leads.delete'::text,
    'crm.assign_sales'::text,
    'crm.manage_attributions'::text,
    'crm.activate_commissions'::text,
    'crm.view_lead_commissions'::text,
    'forms.view'::text,
    'forms.manage'::text,
    'forms.links.view_own'::text,
    'forms.links.create_own'::text,
    'forms.links.delete_own'::text,
    'forms.links.manage_others'::text,
    'coaching.view'::text,
    'coaching.assign'::text,
    'coaching.sessions.create'::text,
    'coaching.sessions.complete'::text,
    'commissions.view_own'::text,
    'commissions.view_all'::text,
    'commissions.mark_paid'::text,
    'bu.manage'::text,
    'org.settings'::text,
    'campaigns.manage'::text,
    'community.manage'::text,
    'community.moderate'::text,
    'community.view_stats'::text
  ]));

create or replace function public.seed_organization_role_permissions(p_organization_id bigint)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.organization_role_permissions (organization_id, role, capability, allowed)
  select p_organization_id, d.role, d.capability, d.allowed
  from (
    values
      ('admin', 'team.invite', true),
      ('admin', 'team.manage_roles', true),
      ('admin', 'team.revoke', true),
      ('admin', 'catalog.manage', true),
      ('admin', 'clients.view', true),
      ('admin', 'clients.enroll_manual', true),
      ('admin', 'sales.view', true),
      ('admin', 'analytics.view', true),
      ('admin', 'crm.leads.view', true),
      ('admin', 'crm.leads.view_own', true),
      ('admin', 'crm.leads.update_status', true),
      ('admin', 'crm.leads.edit', true),
      ('admin', 'crm.leads.delete', true),
      ('admin', 'crm.assign_sales', true),
      ('admin', 'crm.manage_attributions', true),
      ('admin', 'crm.activate_commissions', true),
      ('admin', 'crm.view_lead_commissions', true),
      ('admin', 'forms.view', true),
      ('admin', 'forms.manage', true),
      ('admin', 'forms.links.view_own', true),
      ('admin', 'forms.links.create_own', true),
      ('admin', 'forms.links.delete_own', true),
      ('admin', 'forms.links.manage_others', true),
      ('admin', 'coaching.view', true),
      ('admin', 'coaching.assign', true),
      ('admin', 'coaching.sessions.create', true),
      ('admin', 'coaching.sessions.complete', true),
      ('admin', 'commissions.view_own', true),
      ('admin', 'commissions.view_all', true),
      ('admin', 'commissions.mark_paid', true),
      ('admin', 'bu.manage', true),
      ('admin', 'org.settings', true),
      ('admin', 'campaigns.manage', true),
      ('admin', 'community.manage', true),
      ('admin', 'community.moderate', true),
      ('admin', 'community.view_stats', true),
      ('sales', 'team.invite', false),
      ('sales', 'team.manage_roles', false),
      ('sales', 'team.revoke', false),
      ('sales', 'catalog.manage', false),
      ('sales', 'clients.view', false),
      ('sales', 'clients.enroll_manual', false),
      ('sales', 'sales.view', false),
      ('sales', 'analytics.view', false),
      ('sales', 'crm.leads.view', false),
      ('sales', 'crm.leads.view_own', true),
      ('sales', 'crm.leads.update_status', true),
      ('sales', 'crm.leads.edit', false),
      ('sales', 'crm.leads.delete', false),
      ('sales', 'crm.assign_sales', false),
      ('sales', 'crm.manage_attributions', false),
      ('sales', 'crm.activate_commissions', false),
      ('sales', 'crm.view_lead_commissions', false),
      ('sales', 'forms.view', true),
      ('sales', 'forms.manage', false),
      ('sales', 'forms.links.view_own', true),
      ('sales', 'forms.links.create_own', true),
      ('sales', 'forms.links.delete_own', true),
      ('sales', 'forms.links.manage_others', false),
      ('sales', 'coaching.view', false),
      ('sales', 'coaching.assign', false),
      ('sales', 'coaching.sessions.create', false),
      ('sales', 'coaching.sessions.complete', false),
      ('sales', 'commissions.view_own', true),
      ('sales', 'commissions.view_all', false),
      ('sales', 'commissions.mark_paid', false),
      ('sales', 'bu.manage', false),
      ('sales', 'org.settings', false),
      ('sales', 'campaigns.manage', false),
      ('sales', 'community.manage', false),
      ('sales', 'community.moderate', false),
      ('sales', 'community.view_stats', false),
      ('ambassador', 'team.invite', false),
      ('ambassador', 'team.manage_roles', false),
      ('ambassador', 'team.revoke', false),
      ('ambassador', 'catalog.manage', false),
      ('ambassador', 'clients.view', false),
      ('ambassador', 'clients.enroll_manual', false),
      ('ambassador', 'sales.view', false),
      ('ambassador', 'analytics.view', false),
      ('ambassador', 'crm.leads.view', false),
      ('ambassador', 'crm.leads.view_own', true),
      ('ambassador', 'crm.leads.update_status', true),
      ('ambassador', 'crm.leads.edit', false),
      ('ambassador', 'crm.leads.delete', false),
      ('ambassador', 'crm.assign_sales', false),
      ('ambassador', 'crm.manage_attributions', false),
      ('ambassador', 'crm.activate_commissions', false),
      ('ambassador', 'crm.view_lead_commissions', false),
      ('ambassador', 'forms.view', true),
      ('ambassador', 'forms.manage', false),
      ('ambassador', 'forms.links.view_own', true),
      ('ambassador', 'forms.links.create_own', true),
      ('ambassador', 'forms.links.delete_own', true),
      ('ambassador', 'forms.links.manage_others', false),
      ('ambassador', 'coaching.view', false),
      ('ambassador', 'coaching.assign', false),
      ('ambassador', 'coaching.sessions.create', false),
      ('ambassador', 'coaching.sessions.complete', false),
      ('ambassador', 'commissions.view_own', true),
      ('ambassador', 'commissions.view_all', false),
      ('ambassador', 'commissions.mark_paid', false),
      ('ambassador', 'bu.manage', false),
      ('ambassador', 'org.settings', false),
      ('ambassador', 'campaigns.manage', false),
      ('ambassador', 'community.manage', false),
      ('ambassador', 'community.moderate', false),
      ('ambassador', 'community.view_stats', false),
      ('coach', 'team.invite', false),
      ('coach', 'team.manage_roles', false),
      ('coach', 'team.revoke', false),
      ('coach', 'catalog.manage', false),
      ('coach', 'clients.view', false),
      ('coach', 'clients.enroll_manual', false),
      ('coach', 'sales.view', false),
      ('coach', 'analytics.view', false),
      ('coach', 'crm.leads.view', false),
      ('coach', 'crm.leads.view_own', true),
      ('coach', 'crm.leads.update_status', true),
      ('coach', 'crm.leads.edit', false),
      ('coach', 'crm.leads.delete', false),
      ('coach', 'crm.assign_sales', false),
      ('coach', 'crm.manage_attributions', false),
      ('coach', 'crm.activate_commissions', false),
      ('coach', 'crm.view_lead_commissions', false),
      ('coach', 'forms.view', true),
      ('coach', 'forms.manage', false),
      ('coach', 'coaching.view', true),
      ('coach', 'coaching.assign', false),
      ('coach', 'coaching.sessions.create', true),
      ('coach', 'coaching.sessions.complete', true),
      ('coach', 'forms.links.view_own', true),
      ('coach', 'forms.links.create_own', true),
      ('coach', 'forms.links.delete_own', true),
      ('coach', 'forms.links.manage_others', false),
      ('coach', 'commissions.view_own', true),
      ('coach', 'commissions.view_all', false),
      ('coach', 'commissions.mark_paid', false),
      ('coach', 'bu.manage', false),
      ('coach', 'org.settings', false),
      ('coach', 'campaigns.manage', false),
      ('coach', 'community.manage', false),
      ('coach', 'community.moderate', true),
      ('coach', 'community.view_stats', true),
      ('staff', 'team.invite', false),
      ('staff', 'team.manage_roles', false),
      ('staff', 'team.revoke', false),
      ('staff', 'catalog.manage', false),
      ('staff', 'clients.view', true),
      ('staff', 'clients.enroll_manual', true),
      ('staff', 'sales.view', false),
      ('staff', 'analytics.view', false),
      ('staff', 'crm.leads.view', false),
      ('staff', 'crm.leads.view_own', true),
      ('staff', 'crm.leads.update_status', true),
      ('staff', 'crm.leads.edit', false),
      ('staff', 'crm.leads.delete', false),
      ('staff', 'crm.assign_sales', false),
      ('staff', 'crm.manage_attributions', false),
      ('staff', 'crm.activate_commissions', false),
      ('staff', 'crm.view_lead_commissions', false),
      ('staff', 'forms.view', true),
      ('staff', 'forms.manage', false),
      ('staff', 'forms.links.view_own', true),
      ('staff', 'forms.links.create_own', true),
      ('staff', 'forms.links.delete_own', true),
      ('staff', 'forms.links.manage_others', false),
      ('staff', 'coaching.view', false),
      ('staff', 'coaching.assign', false),
      ('staff', 'coaching.sessions.create', false),
      ('staff', 'coaching.sessions.complete', false),
      ('staff', 'commissions.view_own', true),
      ('staff', 'commissions.view_all', false),
      ('staff', 'commissions.mark_paid', false),
      ('staff', 'bu.manage', false),
      ('staff', 'org.settings', false),
      ('staff', 'campaigns.manage', false),
      ('staff', 'community.manage', false),
      ('staff', 'community.moderate', false),
      ('staff', 'community.view_stats', false),
      ('bu_owner', 'team.invite', true),
      ('bu_owner', 'team.manage_roles', false),
      ('bu_owner', 'team.revoke', false),
      ('bu_owner', 'catalog.manage', true),
      ('bu_owner', 'clients.view', true),
      ('bu_owner', 'clients.enroll_manual', true),
      ('bu_owner', 'sales.view', true),
      ('bu_owner', 'analytics.view', true),
      ('bu_owner', 'crm.leads.view', true),
      ('bu_owner', 'crm.leads.view_own', true),
      ('bu_owner', 'crm.leads.update_status', true),
      ('bu_owner', 'crm.leads.edit', true),
      ('bu_owner', 'crm.leads.delete', true),
      ('bu_owner', 'crm.assign_sales', true),
      ('bu_owner', 'crm.manage_attributions', true),
      ('bu_owner', 'crm.activate_commissions', false),
      ('bu_owner', 'crm.view_lead_commissions', true),
      ('bu_owner', 'forms.view', true),
      ('bu_owner', 'forms.manage', true),
      ('bu_owner', 'forms.links.view_own', true),
      ('bu_owner', 'forms.links.create_own', true),
      ('bu_owner', 'forms.links.delete_own', true),
      ('bu_owner', 'forms.links.manage_others', true),
      ('bu_owner', 'coaching.view', true),
      ('bu_owner', 'coaching.assign', true),
      ('bu_owner', 'coaching.sessions.create', true),
      ('bu_owner', 'coaching.sessions.complete', true),
      ('bu_owner', 'commissions.view_own', true),
      ('bu_owner', 'commissions.view_all', true),
      ('bu_owner', 'commissions.mark_paid', true),
      ('bu_owner', 'bu.manage', false),
      ('bu_owner', 'org.settings', false),
      ('bu_owner', 'campaigns.manage', false),
      ('bu_owner', 'community.manage', true),
      ('bu_owner', 'community.moderate', true),
      ('bu_owner', 'community.view_stats', true)
  ) as d(role, capability, allowed)
  on conflict (organization_id, role, capability) do nothing;
end;
$function$;

do $$
declare
  r record;
begin
  for r in select id from public.organizations
  loop
    perform public.seed_organization_role_permissions(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.community_spaces (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_spaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_spaces_org_slug_unique unique (organization_id, slug)
);

create index if not exists community_spaces_org_idx
  on public.community_spaces (organization_id)
  where archived_at is null;

create table if not exists public.community_space_members (
  id bigint generated always as identity primary key,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role text not null default 'member'
    check (role = any (array['member'::text, 'moderator'::text, 'admin'::text])),
  source text not null default 'manual'
    check (source = any (array['manual'::text, 'enrollment_sync'::text, 'staff'::text])),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint community_space_members_space_user_unique unique (space_id, user_id)
);

create index if not exists community_space_members_user_active_idx
  on public.community_space_members (user_id, organization_id)
  where left_at is null;

create index if not exists community_space_members_space_active_idx
  on public.community_space_members (space_id)
  where left_at is null;

create table if not exists public.community_feeds (
  id bigint generated always as identity primary key,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  who_can_post text not null default 'all'
    check (who_can_post = any (array['admins'::text, 'all'::text])),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint community_feeds_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_feeds_space_slug_unique unique (space_id, slug)
);

create index if not exists community_feeds_space_idx
  on public.community_feeds (space_id, sort_order)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_community_space_member(p_space_id bigint)
 returns boolean
 language sql
 stable
 security definer
 set search_path to 'public'
as $$
  select exists (
    select 1
    from public.community_space_members m
    where m.space_id = p_space_id
      and m.user_id = auth.uid()
      and m.left_at is null
  );
$$;

create or replace function public.community_slugify(p_input text)
 returns text
 language plpgsql
 immutable
 set search_path to 'public'
as $$
declare
  v text;
begin
  v := lower(trim(coalesce(p_input, '')));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := regexp_replace(v, '^-+|-+$', '', 'g');
  if v = '' then
    v := 'space';
  end if;
  return left(v, 60);
end;
$$;

create or replace function public.create_community_space(
  p_organization_id bigint,
  p_name text,
  p_description text default null,
  p_sync_clients boolean default true
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
  values (p_organization_id, trim(p_name), v_slug, nullif(trim(coalesce(p_description, '')), ''))
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

  if p_sync_clients then
    perform public.sync_community_space_members_from_enrollments(v_space.id);
  end if;

  return v_space;
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
  v_count integer := 0;
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

  with candidates as (
    select distinct e.user_id
    from public.enrollments e
    where e.organization_id = v_org_id
      and e.user_id is not null
      and e.status in ('active', 'paused')
  ),
  upserted as (
    insert into public.community_space_members (space_id, organization_id, user_id, role, source)
    select p_space_id, v_org_id, c.user_id, 'member', 'enrollment_sync'
    from candidates c
    on conflict (space_id, user_id) do update
      set left_at = null,
          source = case
            when community_space_members.source = 'staff' then community_space_members.source
            else 'enrollment_sync'
          end
    where community_space_members.left_at is not null
       or community_space_members.source = 'enrollment_sync'
    returning 1
  )
  select count(*)::integer into v_count from upserted;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.create_community_space(bigint, text, text, boolean) from public;
revoke all on function public.sync_community_space_members_from_enrollments(bigint) from public;
grant execute on function public.create_community_space(bigint, text, text, boolean) to authenticated;
grant execute on function public.sync_community_space_members_from_enrollments(bigint) to authenticated;
grant execute on function public.is_community_space_member(bigint) to authenticated;
grant execute on function public.community_slugify(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.community_spaces enable row level security;
alter table public.community_space_members enable row level security;
alter table public.community_feeds enable row level security;

drop policy if exists community_spaces_select on public.community_spaces;
create policy community_spaces_select
  on public.community_spaces
  for select
  to authenticated
  using (
    public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
    or public.has_org_capability(organization_id, 'community.view_stats')
    or public.is_community_space_member(id)
  );

drop policy if exists community_spaces_insert on public.community_spaces;
create policy community_spaces_insert
  on public.community_spaces
  for insert
  to authenticated
  with check (public.has_org_capability(organization_id, 'community.manage'));

drop policy if exists community_spaces_update on public.community_spaces;
create policy community_spaces_update
  on public.community_spaces
  for update
  to authenticated
  using (public.has_org_capability(organization_id, 'community.manage'))
  with check (public.has_org_capability(organization_id, 'community.manage'));

drop policy if exists community_spaces_delete on public.community_spaces;
create policy community_spaces_delete
  on public.community_spaces
  for delete
  to authenticated
  using (public.has_org_capability(organization_id, 'community.manage'));

drop policy if exists community_space_members_select on public.community_space_members;
create policy community_space_members_select
  on public.community_space_members
  for select
  to authenticated
  using (
    public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
    or public.is_community_space_member(space_id)
  );

drop policy if exists community_space_members_write on public.community_space_members;
create policy community_space_members_write
  on public.community_space_members
  for all
  to authenticated
  using (public.has_org_capability(organization_id, 'community.manage'))
  with check (public.has_org_capability(organization_id, 'community.manage'));

drop policy if exists community_feeds_select on public.community_feeds;
create policy community_feeds_select
  on public.community_feeds
  for select
  to authenticated
  using (
    public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
    or public.is_community_space_member(space_id)
  );

drop policy if exists community_feeds_write on public.community_feeds;
create policy community_feeds_write
  on public.community_feeds
  for all
  to authenticated
  using (public.has_org_capability(organization_id, 'community.manage'))
  with check (public.has_org_capability(organization_id, 'community.manage'));
