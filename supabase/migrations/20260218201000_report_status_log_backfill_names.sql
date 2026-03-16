-- Backfill action_by_name for existing report_status_log records
-- Uses security definer to access auth.users

create or replace function public.backfill_status_log_names()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.report_status_log rsl
  set action_by_name = a.full_name
  from public.analyst a
  inner join auth.users u on u.email = a.email
  where u.id = rsl.action_by
    and rsl.action_by_name is null;
end;
$$;

-- Execute the backfill
select public.backfill_status_log_names();

-- Clean up the function
drop function if exists public.backfill_status_log_names();
