-- Modify region table: add name_en, name_cn, is_active fields with comments

-- 0. Ensure the set_updated_at_utc function exists (dependency)
create or replace function public.set_updated_at_utc()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Drop existing constraints and indexes
drop index if exists idx_region_created_at_desc;
drop trigger if exists trg_region_updated_at on public.region;

-- 2. Drop old columns (data will be migrated to name_cn)
alter table public.region drop column if exists name;
alter table public.region drop column if exists code;

-- 3. Add new columns
alter table public.region add column name_en text;
alter table public.region add column name_cn text;
alter table public.region add column code text;
alter table public.region add column is_active boolean not null default true;

-- 4. Seed initial data first (before adding unique constraints)
insert into public.region (name_en, name_cn, code, is_active) values
  ('China', '中国', 'CN', true),
  ('Hong Kong', '香港', 'HK', true),
  ('Japan', '日本', 'JP', true),
  ('Taiwan', '台湾', 'TW', true),
  ('South Korea', '韩国', 'KR', true),
  ('India', '印度', 'IN', true),
  ('Macau', '澳门', 'MO', true),
  ('United States', '美国', 'US', true)
on conflict do nothing;

-- 5. Delete old rows with empty values (if any)
delete from public.region where name_en is null or name_en = '';

-- 6. Set not null constraints
alter table public.region alter column name_en set not null;
alter table public.region alter column name_cn set not null;
alter table public.region alter column code set not null;

-- 7. Add table and column comments
comment on table public.region is 'Region table - stores region information with bilingual names and ISO 3166-1 alpha-2 codes';
comment on column public.region.name_en is 'Region English name';
comment on column public.region.name_cn is 'Region Chinese name';
comment on column public.region.code is 'ISO 3166-1 alpha-2 country/region code';
comment on column public.region.is_active is 'Whether the region is active';

-- 5. Add unique constraints
alter table public.region add constraint uk_region_name_en unique (name_en);
alter table public.region add constraint uk_region_name_cn unique (name_cn);
alter table public.region add constraint uk_region_code unique (code);

-- 6. Recreate indexes
create index if not exists idx_region_created_at_desc
  on public.region (created_at desc);

-- 7. Recreate trigger
create trigger trg_region_updated_at
before update on public.region
for each row execute function public.set_updated_at_utc();

