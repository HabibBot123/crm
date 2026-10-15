-- Denorm coach contact on coaching_assignments (safe for coached SELECT).
-- Avoids exposing organization_members (commissions) to clients.

alter table public.coaching_assignments
  add column if not exists coach_user_id uuid references public.profiles (user_id) on delete set null,
  add column if not exists coach_email text;

create index if not exists coaching_assignments_coach_user_id_idx
  on public.coaching_assignments (coach_user_id);

create or replace function public.sync_coaching_assignment_coach_contact()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  select om.user_id, om.email
    into v_user_id, v_email
  from public.organization_members om
  where om.id = new.organization_member_id;

  new.coach_user_id := v_user_id;
  new.coach_email := nullif(lower(trim(coalesce(v_email, ''))), '');
  return new;
end;
$$;

drop trigger if exists coaching_assignments_sync_coach_contact
  on public.coaching_assignments;
create trigger coaching_assignments_sync_coach_contact
  before insert or update of organization_member_id
  on public.coaching_assignments
  for each row
  execute function public.sync_coaching_assignment_coach_contact();

-- Keep denorm in sync if member email / user_id changes.
create or replace function public.sync_coaching_assignments_from_member()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.user_id is not distinct from old.user_id
     and new.email is not distinct from old.email then
    return new;
  end if;

  update public.coaching_assignments ca
  set
    coach_user_id = new.user_id,
    coach_email = nullif(lower(trim(coalesce(new.email, ''))), '')
  where ca.organization_member_id = new.id;

  return new;
end;
$$;

drop trigger if exists organization_members_sync_coaching_assignments
  on public.organization_members;
create trigger organization_members_sync_coaching_assignments
  after update of user_id, email
  on public.organization_members
  for each row
  execute function public.sync_coaching_assignments_from_member();

-- Backfill
update public.coaching_assignments ca
set
  coach_user_id = om.user_id,
  coach_email = nullif(lower(trim(coalesce(om.email, ''))), '')
from public.organization_members om
where om.id = ca.organization_member_id
  and (
    ca.coach_user_id is distinct from om.user_id
    or ca.coach_email is distinct from nullif(lower(trim(coalesce(om.email, ''))), '')
  );
