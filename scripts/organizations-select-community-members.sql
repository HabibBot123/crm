-- Org branding / DM presence: space member OR active organization_members.
-- Applied via MCP 2026-10-15 ; updated community_org_member_staff.sql.

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

drop policy if exists organizations_select_related on public.organizations;

create policy organizations_select_related
  on public.organizations
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or is_org_member(id)
    or is_org_enrolled(id)
    or is_community_org_member(id)
  );
