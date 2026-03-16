-- Common extensions and shared helpers.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at_utc()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
