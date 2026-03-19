-- Add signup_source to public.users: 'coach' | 'coached' (set in auth callback from URL param)
alter table public.users
  add column if not exists signup_source text;

comment on column public.users.signup_source is 'Source of registration: coach (dashboard signup) or coached (client signup).';
