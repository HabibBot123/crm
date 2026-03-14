-- Course lesson progress: which lessons a user has completed within an enrollment
create table public.course_lesson_progress (
  id                     bigint generated always as identity primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  enrollment_id          bigint not null references public.enrollments(id) on delete cascade,
  product_module_item_id bigint not null references public.product_module_items(id) on delete cascade,
  completed_at           timestamptz,
  created_at             timestamptz default now(),
  unique(user_id, enrollment_id, product_module_item_id)
);

create index idx_course_lesson_progress_user_enrollment
  on public.course_lesson_progress(user_id, enrollment_id);

alter table public.course_lesson_progress enable row level security;

-- Users can only read their own progress
create policy "Users can read own lesson progress"
  on public.course_lesson_progress
  for select
  using (auth.uid() = user_id);

-- Users can insert progress only for their own user_id and for enrollments they own
create policy "Users can insert own lesson progress"
  on public.course_lesson_progress
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid()
    )
  );

-- Users can update only their own progress (e.g. set completed_at)
create policy "Users can update own lesson progress"
  on public.course_lesson_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own progress (optional, for "reset progress")
create policy "Users can delete own lesson progress"
  on public.course_lesson_progress
  for delete
  using (auth.uid() = user_id);
