-- Community posts V1 (feeds). Applied via MCP 2026-10-15.

create or replace function public.is_community_space_staff(p_space_id bigint)
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
      and m.role in ('admin', 'moderator')
  )
  or exists (
    select 1
    from public.community_spaces s
    where s.id = p_space_id
      and (
        public.has_org_capability(s.organization_id, 'community.manage')
        or public.has_org_capability(s.organization_id, 'community.moderate')
      )
  );
$$;

create or replace function public.can_post_to_community_feed(p_feed_id bigint)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.community_feeds f
    where f.id = p_feed_id
      and f.archived_at is null
      and public.is_community_space_member(f.space_id)
      and (
        f.who_can_post = 'all'
        or public.is_community_space_staff(f.space_id)
      )
  );
$$;

revoke all on function public.is_community_space_staff(bigint) from public;
revoke all on function public.can_post_to_community_feed(bigint) from public;
grant execute on function public.is_community_space_staff(bigint) to authenticated;
grant execute on function public.can_post_to_community_feed(bigint) to authenticated;

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  feed_id bigint not null references public.community_feeds (id) on delete cascade,
  author_user_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_posts_body_len check (
    char_length(trim(body)) >= 1 and char_length(body) <= 5000
  )
);

create index if not exists community_posts_feed_created_idx
  on public.community_posts (feed_id, created_at desc)
  where deleted_at is null;

create index if not exists community_posts_space_created_idx
  on public.community_posts (space_id, created_at desc)
  where deleted_at is null;

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row
  execute function public.set_updated_at();

alter table public.community_posts enable row level security;

-- Soft-delete UPDATE must leave the row visible under SELECT (Postgres RLS).
-- Feed queries still filter deleted_at IS NULL in the app.
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select
  on public.community_posts
  for select
  to authenticated
  using (
    (
      public.has_org_capability(organization_id, 'community.manage')
      or public.has_org_capability(organization_id, 'community.moderate')
      or public.is_community_space_member(space_id)
    )
    and (
      deleted_at is null
      or author_user_id = auth.uid()
      or public.is_community_space_staff(space_id)
    )
  );

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert
  on public.community_posts
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and deleted_at is null
    and public.can_post_to_community_feed(feed_id)
    and exists (
      select 1
      from public.community_feeds f
      where f.id = community_posts.feed_id
        and f.space_id = community_posts.space_id
        and f.organization_id = community_posts.organization_id
    )
  );

drop policy if exists community_posts_update on public.community_posts;
create policy community_posts_update
  on public.community_posts
  for update
  to authenticated
  using (
    author_user_id = auth.uid()
    or public.is_community_space_staff(space_id)
  )
  with check (
    author_user_id = auth.uid()
    or public.is_community_space_staff(space_id)
  );

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete
  on public.community_posts
  for delete
  to authenticated
  using (
    author_user_id = auth.uid()
    or public.is_community_space_staff(space_id)
  );
