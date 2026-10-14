-- Provider sync columns + broaden lead/enrollment → campaign_contacts triggers.
-- Applied live via MCP 2026-10-14. See docs/06-database.md.

alter table public.campaign_contacts
  add column if not exists provider_properties_synced_at timestamptz null,
  add column if not exists provider_sync_error text null;

comment on column public.campaign_contacts.provider_properties_synced_at is
  'Last successful push of org-scoped Resend contact properties';
comment on column public.campaign_contacts.provider_sync_error is
  'Last provider sync error code/message (e.g. contacts_quota_exceeded)';

-- Function bodies + triggers: see live DB (first_name/last_name, buyer_name invalidate synced_at).
