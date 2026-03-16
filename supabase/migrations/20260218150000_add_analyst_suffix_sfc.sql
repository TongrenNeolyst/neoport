-- Add missing optional fields used by Analyst Info UI/repo.

alter table public.analyst
  add column if not exists suffix text,
  add column if not exists sfc text;

create index if not exists idx_analyst_suffix
  on public.analyst (suffix);

create index if not exists idx_analyst_sfc
  on public.analyst (sfc);
