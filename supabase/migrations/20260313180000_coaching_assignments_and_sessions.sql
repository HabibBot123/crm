-- Coaching assignments: which org member is assigned as coach for an enrollment_product (coaching pack)
create table public.coaching_assignments (
  id bigint generated always as identity primary key,
  enrollment_product_id bigint not null references public.enrollment_products(id) on delete cascade,
  organization_member_id bigint not null references public.organization_members(id) on delete cascade,
  unique(enrollment_product_id)
);

create index idx_coaching_assignments_enrollment_product
  on public.coaching_assignments(enrollment_product_id);
create index idx_coaching_assignments_organization_member
  on public.coaching_assignments(organization_member_id);

alter table public.coaching_assignments enable row level security;

-- Org members can manage assignments for enrollments of their org (any member can assign any member)
create policy "Coaching assignments: org members full access"
  on public.coaching_assignments
  for all
  using (
    exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where ep.id = coaching_assignments.enrollment_product_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where ep.id = coaching_assignments.enrollment_product_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

-- Coached user can read the assignment for their own enrollment (enrollment_product -> enrollment.user_id = auth.uid())
create policy "Coaching assignments: coached read own"
  on public.coaching_assignments
  for select
  using (
    exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      where ep.id = coaching_assignments.enrollment_product_id
        and e.user_id = auth.uid()
    )
  );

-- Coaching sessions: individual sessions for a coaching pack
create table public.coaching_sessions (
  id bigint generated always as identity primary key,
  enrollment_product_id bigint not null references public.enrollment_products(id) on delete cascade,
  coaching_assignment_id bigint not null references public.coaching_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_mode text,
  meeting_url text,
  location text,
  session_number smallint,
  scheduled_at timestamptz not null,
  duration_minutes integer not null,
  completed_at timestamptz
);

create index idx_coaching_sessions_enrollment_product
  on public.coaching_sessions(enrollment_product_id);
create index idx_coaching_sessions_coaching_assignment
  on public.coaching_sessions(coaching_assignment_id);
create index idx_coaching_sessions_scheduled_at
  on public.coaching_sessions(scheduled_at);
create index idx_coaching_sessions_user_id
  on public.coaching_sessions(user_id);

alter table public.coaching_sessions enable row level security;

-- Org members can full access sessions for their org (via enrollment_products -> enrollments)
create policy "Coaching sessions: org members full access"
  on public.coaching_sessions
  for all
  using (
    exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where ep.id = coaching_sessions.enrollment_product_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where ep.id = coaching_sessions.enrollment_product_id
        and om.user_id = auth.uid()
        and om.status = 'active'
    )
  );

-- Coached user can read their own sessions (user_id = auth.uid())
create policy "Coaching sessions: coached read own"
  on public.coaching_sessions
  for select
  using (user_id = auth.uid());
