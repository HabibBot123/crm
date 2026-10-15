-- Community DMs (1:1) : conversations + messages + Realtime-ready RLS.

create or replace function public.can_community_dm(
  p_organization_id bigint,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    auth.uid() is not null
    and p_other_user_id is not null
    and p_other_user_id <> auth.uid()
    and (
      public.has_org_capability(p_organization_id, 'community.manage')
      or public.has_org_capability(p_organization_id, 'community.moderate')
      or public.is_community_org_member(p_organization_id)
    )
    and (
      public.has_org_capability(p_organization_id, 'community.manage')
      or public.has_org_capability(p_organization_id, 'community.moderate')
      or exists (
        select 1
        from public.community_space_members me
        join public.community_space_members them
          on them.space_id = me.space_id
         and them.user_id = p_other_user_id
         and them.left_at is null
        where me.organization_id = p_organization_id
          and me.user_id = auth.uid()
          and me.left_at is null
      )
      or exists (
        select 1
        from public.organization_members om
        where om.organization_id = p_organization_id
          and om.user_id = p_other_user_id
      )
    );
$$;

revoke all on function public.can_community_dm(bigint, uuid) from public;
grant execute on function public.can_community_dm(bigint, uuid) to authenticated;

create table if not exists public.community_conversations (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  pair_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_conversations_pair_key_format check (
    pair_key ~ '^[0-9a-f-]{36}:[0-9a-f-]{36}$'
  ),
  constraint community_conversations_org_pair_unique unique (organization_id, pair_key)
);

create table if not exists public.community_conversation_participants (
  conversation_id bigint not null references public.community_conversations (id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists community_conversation_participants_user_idx
  on public.community_conversation_participants (user_id, organization_id);

create table if not exists public.community_messages (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  conversation_id bigint not null references public.community_conversations (id) on delete cascade,
  author_user_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_messages_body_len check (
    char_length(trim(body)) >= 1 and char_length(body) <= 5000
  )
);

create index if not exists community_messages_conversation_created_idx
  on public.community_messages (conversation_id, created_at desc)
  where deleted_at is null;

drop trigger if exists community_conversations_set_updated_at on public.community_conversations;
create trigger community_conversations_set_updated_at
  before update on public.community_conversations
  for each row
  execute function public.set_updated_at();

create or replace function public.is_community_conversation_participant(
  p_conversation_id bigint
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.community_conversation_participants p
    where p.conversation_id = p_conversation_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_community_conversation_participant(bigint) from public;
grant execute on function public.is_community_conversation_participant(bigint) to authenticated;

create or replace function public.get_or_create_community_dm(
  p_organization_id bigint,
  p_other_user_id uuid
)
returns public.community_conversations
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_pair text;
  v_row public.community_conversations;
begin
  if v_me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_community_dm(p_organization_id, p_other_user_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_me::text < p_other_user_id::text then
    v_pair := v_me::text || ':' || p_other_user_id::text;
  else
    v_pair := p_other_user_id::text || ':' || v_me::text;
  end if;

  select * into v_row
  from public.community_conversations c
  where c.organization_id = p_organization_id
    and c.pair_key = v_pair;

  if found then
    return v_row;
  end if;

  insert into public.community_conversations (organization_id, pair_key)
  values (p_organization_id, v_pair)
  returning * into v_row;

  insert into public.community_conversation_participants (
    conversation_id, organization_id, user_id
  )
  values
    (v_row.id, p_organization_id, v_me),
    (v_row.id, p_organization_id, p_other_user_id);

  return v_row;
exception
  when unique_violation then
    select * into v_row
    from public.community_conversations c
    where c.organization_id = p_organization_id
      and c.pair_key = v_pair;
    return v_row;
end;
$$;

revoke all on function public.get_or_create_community_dm(bigint, uuid) from public;
grant execute on function public.get_or_create_community_dm(bigint, uuid) to authenticated;

alter table public.community_conversations enable row level security;
alter table public.community_conversation_participants enable row level security;
alter table public.community_messages enable row level security;

drop policy if exists community_conversations_select on public.community_conversations;
create policy community_conversations_select
  on public.community_conversations
  for select
  to authenticated
  using (public.is_community_conversation_participant(id));

drop policy if exists community_conversation_participants_select on public.community_conversation_participants;
create policy community_conversation_participants_select
  on public.community_conversation_participants
  for select
  to authenticated
  using (public.is_community_conversation_participant(conversation_id));

drop policy if exists community_messages_insert on public.community_messages;
create policy community_messages_insert
  on public.community_messages
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and deleted_at is null
    and public.is_community_conversation_participant(conversation_id)
    and exists (
      select 1
      from public.community_conversations c
      where c.id = community_messages.conversation_id
        and c.organization_id = community_messages.organization_id
    )
  );

drop policy if exists community_messages_update on public.community_messages;
create policy community_messages_update
  on public.community_messages
  for update
  to authenticated
  using (
    author_user_id = auth.uid()
    or public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
  )
  with check (
    author_user_id = auth.uid()
    or public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
  );

-- Soft-delete SELECT allow author/staff to see deleted (same pattern as posts)
drop policy if exists community_messages_select on public.community_messages;
create policy community_messages_select
  on public.community_messages
  for select
  to authenticated
  using (
    public.is_community_conversation_participant(conversation_id)
    and (
      deleted_at is null
      or author_user_id = auth.uid()
      or public.has_org_capability(organization_id, 'community.manage')
      or public.has_org_capability(organization_id, 'community.moderate')
    )
  );

create or replace function public.touch_community_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.community_conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists community_messages_touch_conversation on public.community_messages;
create trigger community_messages_touch_conversation
  after insert on public.community_messages
  for each row
  execute function public.touch_community_conversation_on_message();

do $$
begin
  begin
    alter publication supabase_realtime add table public.community_messages;
  exception
    when duplicate_object then null;
  end;
end $$;
