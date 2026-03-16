-- Region table, indexes, trigger, and RLS.

create table if not exists public.region (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_region_created_at_desc
  on public.region (created_at desc);

drop trigger if exists trg_region_updated_at on public.region;
create trigger trg_region_updated_at
before update on public.region
for each row execute function public.set_updated_at_utc();

alter table public.region enable row level security;

drop policy if exists region_select_authenticated on public.region;
create policy region_select_authenticated
on public.region
for select
to authenticated
using (true);

drop policy if exists region_write_admin on public.region;
create policy region_write_admin
on public.region
for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
