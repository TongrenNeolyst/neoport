-- Update RPC functions: change region_id (uuid) to region_code (text)

-- 1. Update rpc_report_create
drop function if exists public.rpc_report_create;
create or replace function public.rpc_report_create(
  p_title text,
  p_report_type text,
  p_coverage_id uuid,
  p_sector_id uuid,
  p_region_code text,
  p_analyst_ids uuid[],
  p_contact_user_id uuid,
  p_target_price numeric,
  p_rating_id uuid,
  p_pdf_data bytea,
  p_pdf_filename text,
  p_current_version_no integer,
  p_rating_agency text,
  p_report_date date,
  p_price_currency text,
  p_target_price_currency text,
  p_target_price_maturity date,
  p_target_price_2 numeric,
  p_target_price_2_currency text,
  p_target_price_2_maturity date,
  p_irr numeric,
  p_irr_currency text,
  p_irr_maturity date,
  p_key_metrics jsonb,
  p_key_risks jsonb,
  p_investment_teaser text,
  p_investment_highlight text,
  p_investment_summary text,
  p_executive_summary text,
  p_table_of_contents jsonb,
  p_analyst_note text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_report_id uuid;
  v_version_id uuid;
begin
  -- Create report
  insert into public.report (
    title,
    report_type,
    coverage_id,
    sector_id,
    region_code,
    current_version_no,
    rating_id,
    target_price,
    target_price_currency,
    target_price_maturity,
    target_price_2,
    target_price_2_currency,
    target_price_2_maturity,
    irr,
    irr_currency,
    irr_maturity,
    key_metrics,
    key_risks,
    investment_teaser,
    investment_highlight,
    investment_summary,
    executive_summary,
    table_of_contents,
    analyst_note,
    owner_user_id,
    report_date,
    rating_agency,
    price_currency
  ) values (
    p_title,
    p_report_type,
    p_coverage_id,
    p_sector_id,
    p_region_code,
    p_current_version_no,
    p_rating_id,
    p_target_price,
    p_target_price_currency,
    p_target_price_maturity,
    p_target_price_2,
    p_target_price_2_currency,
    p_target_price_2_maturity,
    p_irr,
    p_irr_currency,
    p_irr_maturity,
    p_key_metrics,
    p_key_risks,
    p_investment_teaser,
    p_investment_highlight,
    p_investment_summary,
    p_executive_summary,
    p_table_of_contents,
    p_analyst_note,
    p_contact_user_id,
    p_report_date,
    p_rating_agency,
    p_price_currency
  )
  returning id into v_report_id;

  -- Handle PDF
  if p_pdf_data is not null and length(p_pdf_data) > 0 then
    insert into public.report_version (
      report_id,
      version_no,
      pdf_data,
      pdf_filename
    ) values (
      v_report_id,
      1,
      p_pdf_data,
      p_pdf_filename
    )
    returning id into v_version_id;
  end if;

  -- Add analysts
  if p_analyst_ids is not null and array_length(p_analyst_ids, 1) > 0 then
    insert into public.report_analyst (report_id, analyst_user_id)
    select v_report_id, unnest(p_analyst_ids)
    on conflict do nothing;
  end if;

  return v_report_id;
end;
$$;

-- 2. Update rpc_report_update
drop function if exists public.rpc_report_update;
create or replace function public.rpc_report_update(
  p_report_id uuid,
  p_title text,
  p_report_type text,
  p_coverage_id uuid,
  p_sector_id uuid,
  p_region_code text,
  p_analyst_ids uuid[],
  p_contact_user_id uuid,
  p_target_price numeric,
  p_rating_id uuid,
  p_pdf_data bytea,
  p_pdf_filename text,
  p_current_version_no integer,
  p_rating_agency text,
  p_report_date date,
  p_price_currency text,
  p_target_price_currency text,
  p_target_price_maturity date,
  p_target_price_2 numeric,
  p_target_price_2_currency text,
  p_target_price_2_maturity date,
  p_irr numeric,
  p_irr_currency text,
  p_irr_maturity date,
  p_key_metrics jsonb,
  p_key_risks jsonb,
  p_investment_teaser text,
  p_investment_highlight text,
  p_investment_summary text,
  p_executive_summary text,
  p_table_of_contents jsonb,
  p_analyst_note text
)
returns void
language plpgsql
security definer
as $$
declare
  v_current_version_no integer;
  v_new_version_no integer;
  v_version_id uuid;
begin
  -- Get current version
  select current_version_no into v_current_version_no from public.report where id = p_report_id;

  -- Update report
  update public.report set
    title = p_title,
    report_type = p_report_type,
    coverage_id = p_coverage_id,
    sector_id = p_sector_id,
    region_code = p_region_code,
    current_version_no = p_current_version_no,
    rating_id = p_rating_id,
    target_price = p_target_price,
    target_price_currency = p_target_price_currency,
    target_price_maturity = p_target_price_maturity,
    target_price_2 = p_target_price_2,
    target_price_2_currency = p_target_price_2_currency,
    target_price_2_maturity = p_target_price_2_maturity,
    irr = p_irr,
    irr_currency = p_irr_currency,
    irr_maturity = p_irr_maturity,
    key_metrics = p_key_metrics,
    key_risks = p_key_risks,
    investment_teaser = p_investment_teaser,
    investment_highlight = p_investment_highlight,
    investment_summary = p_investment_summary,
    executive_summary = p_executive_summary,
    table_of_contents = p_table_of_contents,
    analyst_note = p_analyst_note,
    rating_agency = p_rating_agency,
    report_date = p_report_date,
    price_currency = p_price_currency,
    updated_at = now()
  where id = p_report_id;

  -- Handle PDF
  if p_pdf_data is not null and length(p_pdf_data) > 0 then
    v_new_version_no := v_current_version_no + 1;

    insert into public.report_version (
      report_id,
      version_no,
      pdf_data,
      pdf_filename
    ) values (
      p_report_id,
      v_new_version_no,
      p_pdf_data,
      p_pdf_filename
    )
    returning id into v_version_id;

    update public.report set current_version_no = v_new_version_no where id = p_report_id;
  end if;

  -- Update analysts
  delete from public.report_analyst where report_id = p_report_id;
  if p_analyst_ids is not null and array_length(p_analyst_ids, 1) > 0 then
    insert into public.report_analyst (report_id, analyst_user_id)
    select p_report_id, unnest(p_analyst_ids)
    on conflict do nothing;
  end if;
end;
$$;

-- 3. Update rpc_report_detail
drop function if exists public.rpc_report_detail;
create or replace function public.rpc_report_detail(p_report_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'report_type', r.report_type,
    'status', r.status,
    'current_version_no', r.current_version_no,
    'coverage_id', r.coverage_id,
    'sector_id', r.sector_id,
    'region_code', r.region_code,
    'target_price', r.target_price,
    'target_price_currency', r.target_price_currency,
    'target_price_maturity', r.target_price_maturity,
    'target_price_2', r.target_price_2,
    'target_price_2_currency', r.target_price_2_currency,
    'target_price_2_maturity', r.target_price_2_maturity,
    'irr', r.irr,
    'irr_currency', r.irr_currency,
    'irr_maturity', r.irr_maturity,
    'key_metrics', r.key_metrics,
    'key_risks', r.key_risks,
    'investment_teaser', r.investment_teaser,
    'investment_highlight', r.investment_highlight,
    'investment_summary', r.investment_summary,
    'executive_summary', r.executive_summary,
    'table_of_contents', r.table_of_contents,
    'analyst_note', r.analyst_note,
    'owner_user_id', r.owner_user_id,
    'rating_id', r.rating_id,
    'rating_agency', r.rating_agency,
    'report_date', r.report_date,
    'price_currency', r.price_currency,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'published_by', r.published_by,
    'published_at', r.published_at,
    'analysts', (
      select jsonb_agg(jsonb_build_object(
        'user_id', ra.analyst_user_id,
        'user_email', au.email
      ))
      from public.report_analyst ra
      join auth.users au on ra.analyst_user_id = au.id
      where ra.report_id = r.id
    ),
    'versions', (
      select jsonb_agg(jsonb_build_object(
        'id', rv.id,
        'version_no', rv.version_no,
        'pdf_filename', rv.pdf_filename,
        'created_at', rv.created_at
      ) order by rv.version_no desc)
      from public.report_version rv
      where rv.report_id = r.id
    )
  ) into v_result
  from public.report r
  where r.id = p_report_id;

  return v_result;
end;
$$;
