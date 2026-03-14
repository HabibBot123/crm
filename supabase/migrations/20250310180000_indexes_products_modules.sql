-- Indexes for product/module tables (queries and RLS policies)

create index if not exists idx_product_module_items_product_module_id
  on public.product_module_items(product_module_id);

create index if not exists idx_product_modules_product_id
  on public.product_modules(product_id);

create index if not exists idx_products_status
  on public.products(status);
