-- Modify report table: change region_id to region_code

-- 1. Drop the old region_id column and its foreign key constraint
alter table public.report drop constraint if exists report_region_id_fkey;
alter table public.report drop column if exists region_id;

-- 2. Add new region_code column (references region.code)
alter table public.report add column region_code text references public.region(code) on delete set null;

-- 3. Add comment
comment on column public.report.region_code is 'Region code (ISO 3166-1 alpha-2), references region.code';

-- 4. Migrate existing data if region_id had data
-- Note: This requires mapping old region_id to region_code
-- If there's existing data, you may need to manually migrate it
-- Example: UPDATE public.report r SET region_code = rg.code FROM public.region rg WHERE r.region_id = rg.id;
