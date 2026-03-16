-- RLS on organization_members so coached can read their assigned coach; org members can read same org.
alter table public.organization_members enable row level security;

-- Org members can read all members of their organization (dashboard).
create policy "Organization members: read same org"
  on public.organization_members
  for select
  using (
    exists (
      select 1 from public.organization_members om2
      where om2.organization_id = organization_members.organization_id
        and om2.user_id = auth.uid()
        and om2.status = 'active'
    )
  );

-- Coached can read the organization_member row that is their assigned coach (to show name/email).
create policy "Organization members: coached read assigned coach"
  on public.organization_members
  for select
  using (
    exists (
      select 1
      from public.coaching_assignments ca
      join public.enrollment_products ep on ep.id = ca.enrollment_product_id
      join public.enrollments e on e.id = ep.enrollment_id
      where ca.organization_member_id = organization_members.id
        and e.user_id = auth.uid()
    )
  );
