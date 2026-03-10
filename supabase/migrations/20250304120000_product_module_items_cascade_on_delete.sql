-- Add ON DELETE CASCADE on product_module_items.product_module_id
-- so that when a module is deleted, its lessons are automatically removed.

ALTER TABLE product_module_items
  DROP CONSTRAINT IF EXISTS product_module_items_product_module_id_fkey,
  ADD CONSTRAINT product_module_items_product_module_id_fkey
    FOREIGN KEY (product_module_id)
    REFERENCES product_modules(id)
    ON DELETE CASCADE;
