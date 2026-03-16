-- Coverage and coverage_analyst tables, indexes, triggers, and RLS.

create table if not exists public.coverage (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  english_full_name text not null,
  chinese_short_name text,
  traditional_chinese text,
  sector_id uuid not null references public.sector(id) on delete restrict,
  isin text not null,
  country_of_domicile text not null,
  reporting_currency text,
  ads_conversion_factor numeric(18, 6) check (ads_conversion_factor > 0),
  is_duplicate boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uidx_coverage_ticker_lower
  on public.coverage(lower(btrim(ticker)));
create unique index if not exists uidx_coverage_isin_upper
  on public.coverage(upper(btrim(isin)));
create index if not exists idx_coverage_sector
  on public.coverage(sector_id);
create index if not exists idx_coverage_name_lower
  on public.coverage(lower(english_full_name));
create index if not exists idx_coverage_updated_at_desc
  on public.coverage(updated_at desc);

drop trigger if exists trg_coverage_updated_at on public.coverage;
create trigger trg_coverage_updated_at
before update on public.coverage
for each row execute function public.set_updated_at_utc();

alter table public.coverage enable row level security;

drop policy if exists coverage_select_authenticated on public.coverage;
create policy coverage_select_authenticated
on public.coverage
for select
to authenticated
using (true);

drop policy if exists coverage_insert_admin_analyst on public.coverage;
create policy coverage_insert_admin_analyst
on public.coverage
for insert
to authenticated
with check ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'sa', 'analyst'));

drop policy if exists coverage_update_admin on public.coverage;
create policy coverage_update_admin
on public.coverage
for update
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists coverage_delete_admin on public.coverage;
create policy coverage_delete_admin
on public.coverage
for delete
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- coverage_analyst
create table if not exists public.coverage_analyst (
  id uuid primary key default gen_random_uuid(),
  coverage_id uuid not null references public.coverage(id) on delete cascade,
  analyst_id uuid not null references public.analyst(id) on delete restrict,
  role smallint not null check (role between 1 and 4),
  sort_order smallint not null check (sort_order between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coverage_analyst_uniq_pair unique (coverage_id, analyst_id),
  constraint coverage_analyst_uniq_sort unique (coverage_id, sort_order)
);

create index if not exists idx_cov_analyst_coverage
  on public.coverage_analyst(coverage_id);
create index if not exists idx_cov_analyst_analyst
  on public.coverage_analyst(analyst_id);

create or replace function public.validate_coverage_analyst_limit()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  if tg_op = 'INSERT' then
    select count(*) into v_count
    from public.coverage_analyst
    where coverage_id = new.coverage_id;

    if v_count >= 4 then
      raise exception 'a coverage can have at most 4 analysts';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.coverage_id is distinct from old.coverage_id then
    select count(*) into v_count
    from public.coverage_analyst
    where coverage_id = new.coverage_id;

    if v_count >= 4 then
      raise exception 'a coverage can have at most 4 analysts';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_coverage_analyst_limit on public.coverage_analyst;
create trigger trg_coverage_analyst_limit
before insert or update on public.coverage_analyst
for each row execute function public.validate_coverage_analyst_limit();

drop trigger if exists trg_coverage_analyst_updated_at on public.coverage_analyst;
create trigger trg_coverage_analyst_updated_at
before update on public.coverage_analyst
for each row execute function public.set_updated_at_utc();

alter table public.coverage_analyst enable row level security;

drop policy if exists coverage_analyst_select_authenticated on public.coverage_analyst;
create policy coverage_analyst_select_authenticated
on public.coverage_analyst
for select
to authenticated
using (true);

drop policy if exists coverage_analyst_insert_admin_analyst on public.coverage_analyst;
create policy coverage_analyst_insert_admin_analyst
on public.coverage_analyst
for insert
to authenticated
with check ((auth.jwt()->'app_metadata'->>'role') in ('admin', 'sa', 'analyst'));

drop policy if exists coverage_analyst_update_admin on public.coverage_analyst;
create policy coverage_analyst_update_admin
on public.coverage_analyst
for update
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

drop policy if exists coverage_analyst_delete_admin on public.coverage_analyst;
create policy coverage_analyst_delete_admin
on public.coverage_analyst
for delete
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin');
