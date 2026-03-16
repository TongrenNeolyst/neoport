-- Modify analyst table: change region_id to region_code

-- 1. Drop the old region_id column and its foreign key constraint
alter table public.analyst drop constraint if exists analyst_region_id_fkey;
alter table public.analyst drop column if exists region_id;

-- 2. Add new region_code column (references region.code)
alter table public.analyst add column region_code text references public.region(code) on delete set null;

-- 3. Add comment
comment on column public.analyst.region_code is 'Region code (ISO 3166-1 alpha-2), references region.code';
