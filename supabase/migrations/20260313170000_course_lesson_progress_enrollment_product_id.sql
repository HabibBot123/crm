-- Switch course_lesson_progress from enrollment_id to enrollment_product_id
-- so progress is per (enrollment_product, lesson), not per (enrollment, lesson).

-- 1) Drop existing unique constraint and index
alter table public.course_lesson_progress
  drop constraint if exists course_lesson_progress_user_id_enrollment_id_product_module_key;

drop index if exists public.idx_course_lesson_progress_user_enrollment;

-- 2) Add new column (nullable for backfill)
alter table public.course_lesson_progress
  add column if not exists enrollment_product_id bigint references public.enrollment_products(id) on delete cascade;

-- 3) Backfill: set enrollment_product_id from enrollment_id + product of the module item
update public.course_lesson_progress clp
set enrollment_product_id = (
  select ep.id
  from public.enrollment_products ep
  join public.product_module_items pmi on pmi.id = clp.product_module_item_id
  join public.product_modules pm on pm.id = pmi.product_module_id
  where ep.enrollment_id = clp.enrollment_id
    and ep.product_id = pm.product_id
  limit 1
)
where clp.enrollment_product_id is null and clp.enrollment_id is not null;

-- 4) Remove rows that could not be mapped (so we can set NOT NULL)
delete from public.course_lesson_progress
where enrollment_product_id is null and enrollment_id is not null;

-- 5) Make column not null and drop old column
alter table public.course_lesson_progress
  alter column enrollment_product_id set not null;

alter table public.course_lesson_progress
  drop column enrollment_id;

-- 6) New unique constraint and index
alter table public.course_lesson_progress
  add constraint course_lesson_progress_user_id_enrollment_product_id_product_module_key
  unique (user_id, enrollment_product_id, product_module_item_id);

create index idx_course_lesson_progress_user_enrollment_product
  on public.course_lesson_progress(user_id, enrollment_product_id);

-- 7) RLS: update insert policy to check access via enrollment_products -> enrollments
drop policy if exists "Users can insert own lesson progress" on public.course_lesson_progress;

create policy "Users can insert own lesson progress"
  on public.course_lesson_progress
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.enrollment_products ep
      join public.enrollments e on e.id = ep.enrollment_id
      where ep.id = enrollment_product_id and e.user_id = auth.uid()
    )
  );
