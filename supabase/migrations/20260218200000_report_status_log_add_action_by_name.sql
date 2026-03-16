-- Add action_by_name column to report_status_log

alter table public.report_status_log
  add column if not exists action_by_name text;

-- Update existing records with names from analyst table (by email matching)
update public.report_status_log rsl
set action_by_name = a.full_name
from public.analyst a
where a.email = (
  select email from auth.users where id = rsl.action_by
);

-- Create index for the new column
create index if not exists idx_report_status_log_action_by_name
  on public.report_status_log (action_by_name);

-- Update the RPC function to include action_by_name
create or replace function public.report_change_status_atomic(
  p_report_id uuid,
  p_to_status text,
  p_action_by uuid,
  p_reason text default null
)
returns public.report
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.report%rowtype;
  v_updated public.report%rowtype;
  v_now timestamptz := now();
  v_role text := public.current_app_role();
  v_uid uuid := auth.uid();
  v_action_by_name text;
begin
  if v_uid is null then
    raise exception 'unauthorized';
  end if;

  if p_action_by is distinct from v_uid then
    raise exception 'action_by must match auth.uid';
  end if;

  -- Get action_by_name from analyst table
  select a.full_name into v_action_by_name
  from public.analyst a
  inner join auth.users u on u.email = a.email
  where u.id = p_action_by;

  select *
    into v_current
  from public.report
  where id = p_report_id
  for update;

  if not found then
    raise exception 'report not found or no permission';
  end if;

  if v_role = 'admin' then
    null;
  elsif v_role = 'sa' then
    if not (
      (v_current.status = 'submitted' and p_to_status in ('published', 'rejected'))
      or (v_current.status = 'rejected' and p_to_status = 'draft')
    ) then
      raise exception 'no permission for this status transition';
    end if;
  elsif v_role = 'analyst' then
    if not (
      v_current.owner_user_id = v_uid
      and v_current.status = 'draft'
      and p_to_status = 'submitted'
    ) then
      raise exception 'no permission for this status transition';
    end if;
  else
    raise exception 'no permission';
  end if;

  update public.report
  set
    status = p_to_status,
    published_by = case when p_to_status = 'published' then p_action_by else published_by end,
    published_at = case when p_to_status = 'published' then v_now else published_at end
  where id = p_report_id
  returning *
    into v_updated;

  insert into public.report_status_log (
    report_id,
    from_status,
    to_status,
    action_by,
    action_by_name,
    action_at,
    reason,
    version_no
  )
  values (
    p_report_id,
    v_current.status,
    p_to_status,
    p_action_by,
    v_action_by_name,
    v_now,
    nullif(btrim(coalesce(p_reason, '')), ''),
    v_current.current_version_no
  );

  return v_updated;
end;
$$;
