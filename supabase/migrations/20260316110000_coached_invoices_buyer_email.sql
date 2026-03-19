-- Add buyer_email so invoices can be matched before user_id is reconciled (RLS by email).
alter table public.coached_invoices
  add column if not exists buyer_email text;

create index if not exists idx_coached_invoices_buyer_email
  on public.coached_invoices(buyer_email);

-- RLS: allow SELECT by user_id OR by buyer_email (current user's email from JWT)
drop policy if exists "coached_invoices_select_own" on public.coached_invoices;

create policy "coached_invoices_select_own"
  on public.coached_invoices
  for select
  using (
    user_id = auth.uid()
    or (
      buyer_email is not null
      and lower(buyer_email) = lower((auth.jwt() ->> 'email'))
    )
  );
