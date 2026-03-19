alter table public.organization_members
  add column if not exists invitation_token text unique;

