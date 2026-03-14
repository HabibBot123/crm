-- RLS on products: SELECT allowed for (1) published products, (2) products of orgs the user is a member of
alter table public.products enable row level security;

-- Anyone can read published products (storefront, coached course details)
create policy "Products: select published"
  on public.products
  for select
  using (status = 'published');

-- Org members can read all products of their orgs (dashboard: draft, published, archived)
create policy "Products: select own org"
  on public.products
  for select
  using (
    organization_id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
        and status = 'active'
    )
  );
