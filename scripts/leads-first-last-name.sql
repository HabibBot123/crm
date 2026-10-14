-- leads.first_name / last_name + full_name derived by trigger
-- Applied via MCP: leads_first_last_name

alter table public.leads
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.leads
set
  first_name = nullif(btrim(split_part(btrim(full_name), ' ', 1)), ''),
  last_name = nullif(
    btrim(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 1)),
    ''
  )
where first_name is null
  and full_name is not null
  and btrim(full_name) <> '';

update public.leads
set first_name = coalesce(nullif(btrim(full_name), ''), 'Unknown')
where first_name is null or btrim(first_name) = '';

alter table public.leads
  alter column first_name set not null;

create or replace function public.leads_set_full_name_from_parts()
returns trigger
language plpgsql
as $$
begin
  new.first_name := nullif(btrim(coalesce(new.first_name, '')), '');
  new.last_name := nullif(btrim(coalesce(new.last_name, '')), '');
  if new.first_name is null then
    raise exception 'leads.first_name is required';
  end if;
  new.full_name := btrim(concat_ws(' ', new.first_name, new.last_name));
  return new;
end;
$$;

drop trigger if exists leads_set_full_name_from_parts on public.leads;

create trigger leads_set_full_name_from_parts
before insert or update of first_name, last_name
on public.leads
for each row
execute function public.leads_set_full_name_from_parts();

update public.leads
set first_name = first_name
where first_name is not null;
