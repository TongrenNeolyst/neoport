-- Update RPC function to accept file names and chief approval screenshot
create or replace function public.report_save_content_atomic(
  p_report_id uuid,
  p_title text,
  p_report_type text,
  p_ticker text,
  p_rating text,
  p_target_price text,
  p_region_id uuid,
  p_sector_id uuid,
  p_report_language text,
  p_contact_person text,
  p_investment_thesis text,
  p_certificate_confirmed boolean,
  p_coverage_id uuid,
  p_analysts jsonb,
  p_changed_by uuid,
  p_word_file_path text,
  p_model_file_path text,
  p_word_file_name text,
  p_model_file_name text,
  p_chief_approval_screenshot_path text default null,
  p_chief_approval_screenshot_name text default null
)
returns public.report
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current public.report%rowtype;
  v_updated public.report%rowtype;
  v_next_version integer;
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  if p_changed_by is distinct from auth.uid() then
    raise exception 'changed_by must match auth.uid';
  end if;

  select *
    into v_current
  from public.report
  where id = p_report_id
  for update;

  if not found then
    raise exception 'report not found or no permission';
  end if;

  v_next_version := coalesce(v_current.current_version_no, 0) + 1;

  update public.report
  set
    title = p_title,
    report_type = p_report_type,
    ticker = nullif(btrim(coalesce(p_ticker, '')), ''),
    rating = nullif(btrim(coalesce(p_rating, '')), ''),
    target_price = nullif(btrim(coalesce(p_target_price, '')), ''),
    region_id = p_region_id,
    sector_id = p_sector_id,
    report_language = nullif(btrim(coalesce(p_report_language, '')), ''),
    contact_person = nullif(btrim(coalesce(p_contact_person, '')), ''),
    investment_thesis = nullif(btrim(coalesce(p_investment_thesis, '')), ''),
    certificate_confirmed = coalesce(p_certificate_confirmed, false),
    coverage_id = p_coverage_id,
    current_version_no = v_next_version
  where id = p_report_id
  returning *
    into v_updated;

  delete from public.report_analyst
  where report_id = p_report_id;

  insert into public.report_analyst (
    report_id,
    analyst_id,
    role,
    sort_order
  )
  select
    p_report_id,
    (item->>'analyst_id')::uuid,
    (item->>'role')::smallint,
    (item->>'sort_order')::smallint
  from jsonb_array_elements(coalesce(p_analysts, '[]'::jsonb)) as item;

  v_snapshot := jsonb_build_object(
    'report_id', v_updated.id,
    'owner_user_id', v_updated.owner_user_id,
    'owner_name', v_updated.owner_user_id::text,
    'title', v_updated.title,
    'report_type', v_updated.report_type,
    'ticker', v_updated.ticker,
    'rating', v_updated.rating,
    'target_price', v_updated.target_price,
    'region_id', v_updated.region_id,
    'sector_id', v_updated.sector_id,
    'report_language', v_updated.report_language,
    'contact_person', v_updated.contact_person,
    'investment_thesis', v_updated.investment_thesis,
    'certificate_confirmed', v_updated.certificate_confirmed,
    'status', v_updated.status,
    'version_no', v_updated.current_version_no,
    'coverage_id', v_updated.coverage_id,
    'analyst_names',
      coalesce(
        (
          select jsonb_agg(coalesce(a.full_name, 'Unknown') order by ra.sort_order)
          from public.report_analyst ra
          left join public.analyst a on a.id = ra.analyst_id
          where ra.report_id = p_report_id
        ),
        '[]'::jsonb
      ),
    'analysts',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'analyst_id', ra.analyst_id,
              'analyst_name', coalesce(a.full_name, 'Unknown'),
              'role', ra.role,
              'sort_order', ra.sort_order
            )
            order by ra.sort_order
          )
          from public.report_analyst ra
          left join public.analyst a on a.id = ra.analyst_id
          where ra.report_id = p_report_id
        ),
        '[]'::jsonb
      )
  );

  insert into public.report_version (
    report_id,
    version_no,
    snapshot_json,
    word_file_path,
    word_file_name,
    model_file_path,
    model_file_name,
    chief_approval_screenshot_path,
    chief_approval_screenshot_name,
    changed_by,
    changed_at
  )
  values (
    p_report_id,
    v_next_version,
    v_snapshot,
    p_word_file_path,
    p_word_file_name,
    p_model_file_path,
    p_model_file_name,
    p_chief_approval_screenshot_path,
    p_chief_approval_screenshot_name,
    p_changed_by,
    now()
  );

  return v_updated;
end;
$$;
