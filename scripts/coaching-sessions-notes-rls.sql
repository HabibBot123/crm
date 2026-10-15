-- Session notes (TipTap HTML) + client UPDATE + coach DELETE via sessions.create.

alter table public.coaching_sessions
  add column if not exists notes text;

-- Client can update sessions on their own living pack (edit / note / complete).
drop policy if exists coaching_sessions_update_own_pack on public.coaching_sessions;
create policy coaching_sessions_update_own_pack
  on public.coaching_sessions
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      where ep.id = coaching_sessions.enrollment_product_id
        and e.user_id = auth.uid()
        and e.status = any (array['active'::text, 'paused'::text])
    )
  )
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

-- Coach with sessions.create can delete (in addition to coaching.assign).
drop policy if exists coaching_sessions_delete_create on public.coaching_sessions;
create policy coaching_sessions_delete_create
  on public.coaching_sessions
  for delete
  to authenticated
  using (
    public.has_org_capability(organization_id, 'coaching.sessions.create')
  );
