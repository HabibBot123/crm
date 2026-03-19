-- Link coached_invoices to offer for display (offer title)
alter table public.coached_invoices
  add column if not exists offer_id bigint references public.offers(id) on delete set null;

create index if not exists idx_coached_invoices_offer_id
  on public.coached_invoices(offer_id);
