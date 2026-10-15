-- Community post likes + flat comments. Feed stays member-scoped (like posts).

create table if not exists public.community_post_likes (
  post_id bigint not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists community_post_likes_space_idx
  on public.community_post_likes (space_id);
create index if not exists community_post_likes_user_idx
  on public.community_post_likes (user_id);

alter table public.community_post_likes enable row level security;

drop policy if exists community_post_likes_select on public.community_post_likes;
create policy community_post_likes_select
  on public.community_post_likes
  for select
  to authenticated
  using (
    public.has_org_capability(organization_id, 'community.manage')
    or public.has_org_capability(organization_id, 'community.moderate')
    or public.is_community_space_member(space_id)
  );

drop policy if exists community_post_likes_insert on public.community_post_likes;
create policy community_post_likes_insert
  on public.community_post_likes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_community_space_member(space_id)
    and exists (
      select 1
      from public.community_posts p
      where p.id = community_post_likes.post_id
        and p.space_id = community_post_likes.space_id
        and p.organization_id = community_post_likes.organization_id
        and p.deleted_at is null
    )
  );

drop policy if exists community_post_likes_delete on public.community_post_likes;
create policy community_post_likes_delete
  on public.community_post_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

create table if not exists public.community_post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.community_posts (id) on delete cascade,
  organization_id bigint not null references public.organizations (id) on delete cascade,
  space_id bigint not null references public.community_spaces (id) on delete cascade,
  author_user_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint community_post_comments_body_len check (
    char_length(trim(body)) >= 1 and char_length(body) <= 2000
  )
);

create index if not exists community_post_comments_post_created_idx
  on public.community_post_comments (post_id, created_at asc)
  where deleted_at is null;

drop trigger if exists community_post_comments_set_updated_at on public.community_post_comments;
create trigger community_post_comments_set_updated_at
  before update on public.community_post_comments
  for each row
  execute function public.set_updated_at();

alter table public.community_post_comments enable row level security;

drop policy if exists community_post_comments_select on public.community_post_comments;
create policy community_post_comments_select
  on public.community_post_comments
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

drop policy if exists community_post_comments_insert on public.community_post_comments;
create policy community_post_comments_insert
  on public.community_post_comments
  for insert
  to authenticated
  with check (
    author_user_id = auth.uid()
    and deleted_at is null
    and public.is_community_space_member(space_id)
    and exists (
      select 1
      from public.community_posts p
      where p.id = community_post_comments.post_id
        and p.space_id = community_post_comments.space_id
        and p.organization_id = community_post_comments.organization_id
        and p.deleted_at is null
    )
  );

drop policy if exists community_post_comments_update on public.community_post_comments;
create policy community_post_comments_update
  on public.community_post_comments
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

create or replace function public.community_posts_engagement(
  p_post_ids bigint[],
  p_user_id uuid default auth.uid()
)
returns table (
  post_id bigint,
  like_count bigint,
  comment_count bigint,
  liked_by_me boolean
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    p.id as post_id,
    coalesce((select count(*) from public.community_post_likes l where l.post_id = p.id), 0) as like_count,
    coalesce((
      select count(*)
      from public.community_post_comments c
      where c.post_id = p.id and c.deleted_at is null
    ), 0) as comment_count,
    exists (
      select 1
      from public.community_post_likes l
      where l.post_id = p.id
        and l.user_id = p_user_id
    ) as liked_by_me
  from unnest(p_post_ids) as p(id);
$$;

revoke all on function public.community_posts_engagement(bigint[], uuid) from public;
grant execute on function public.community_posts_engagement(bigint[], uuid) to authenticated;
