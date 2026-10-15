-- is_community_org_member: space member OR active organization_members.
-- coaching_sessions: enrolled client can INSERT sessions on their own pack.

create or replace function public.is_community_org_member(p_org_id bigint)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.community_space_members m
        join public.community_spaces s on s.id = m.space_id
        where s.organization_id = p_org_id
          and m.user_id = auth.uid()
          and m.left_at is null
          and s.archived_at is null
      )
      or exists (
        select 1
        from public.organization_members om
        where om.organization_id = p_org_id
          and om.user_id = auth.uid()
          and om.status = 'active'
      )
    );
$$;

revoke all on function public.is_community_org_member(bigint) from public;
grant execute on function public.is_community_org_member(bigint) to authenticated;

drop policy if exists coaching_sessions_insert_own_pack on public.coaching_sessions;
create policy coaching_sessions_insert_own_pack
  on public.coaching_sessions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      where ep.id = coaching_sessions.enrollment_product_id
        and e.user_id = auth.uid()
        and e.status = any (array['active'::text, 'paused'::text])
    )
  );
