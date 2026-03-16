-- Change contact_person to contact_person_id (关联 auth.users.id)

-- 1. 删除旧的 contact_person 字段
alter table public.report
  drop column if exists contact_person;

-- 2. 添加新字段 contact_person_id 关联 auth.users
alter table public.report
  add column if not exists contact_person_id uuid references auth.users(id) on delete set null;

-- 3. 创建索引
create index if not exists idx_report_contact_person_id on public.report(contact_person_id);

-- 4. 更新 report_save_content_atomic 函数，移除 contact_person 参数，添加 contact_person_id 参数
create or replace function public.report_save_content_atomic(
  p_report_id uuid,
  p_title text,
  p_report_type text,
  p_ticker text,
  p_rating text,
  p_target_price numeric,
  p_region_id uuid,
  p_sector_id uuid,
  p_report_language text,
  p_contact_person_id uuid,
  p_investment_thesis text,
  p_certificate_confirmed boolean,
  p_coverage_id uuid,
  p_analysts jsonb,
  p_changed_by uuid,
  p_word_file_path text,
  p_model_file_path text
)
returns public.report
language plpgsql
as $$
declare
  v_report public.report;
  v_current_version_no integer;
  v_updated public.report;
begin
  -- 获取当前版本号
  select current_version_no into v_current_version_no
  from public.report
  where id = p_report_id;

  -- 保存内容到 report 表
  update public.report
  set
    title = coalesce(nullif(btrim(p_title), ''), title),
    report_type = coalesce(nullif(btrim(p_report_type), ''), report_type),
    ticker = nullif(btrim(p_ticker), ''),
    rating = nullif(btrim(p_rating), ''),
    target_price = case when p_target_price is null or p_target_price <= 0 then null else p_target_price end,
    region_id = p_region_id,
    sector_id = p_sector_id,
    report_language = nullif(btrim(p_report_language), ''),
    contact_person_id = p_contact_person_id,
    investment_thesis = nullif(btrim(p_investment_thesis), ''),
    certificate_confirmed = p_certificate_confirmed,
    coverage_id = p_coverage_id,
    updated_at = now()
  where id = p_report_id
  returning * into v_updated;

  -- 处理作者关系
  if p_analysts is not null and jsonb_typeof(p_analysts) = 'array' then
    -- 删除旧的作者关系
    delete from public.report_analyst where report_id = p_report_id;

    -- 插入新的作者关系
    insert into public.report_analyst (report_id, analyst_id, role, sort_order)
    select
      p_report_id,
      (elem->>'analyst_id')::uuid,
      (elem->>'role')::smallint,
      (elem->>'sort_order')::smallint
    from jsonb_array_elements(p_analysts) as elem;
  end if;

  -- 处理文件
  if p_word_file_path is not null or p_model_file_path is not null then
    -- 增加版本号
    v_current_version_no := v_current_version_no + 1;

    update public.report
    set current_version_no = v_current_version_no,
        updated_at = now()
    where id = p_report_id;

    -- 插入新版本
    insert into public.report_version (
      report_id,
      version_no,
      snapshot_json,
      word_file_path,
      model_file_path,
      changed_by
    ) values (
      p_report_id,
      v_current_version_no,
      jsonb_build_object(
        'title', v_updated.title,
        'report_type', v_updated.report_type,
        'ticker', v_updated.ticker,
        'rating', v_updated.rating,
        'target_price', v_updated.target_price,
        'region_id', v_updated.region_id,
        'sector_id', v_updated.sector_id,
        'report_language', v_updated.report_language,
        'contact_person_id', v_updated.contact_person_id,
        'investment_thesis', v_updated.investment_thesis,
        'certificate_confirmed', v_updated.certificate_confirmed,
        'coverage_id', v_updated.coverage_id
      ),
      p_word_file_path,
      p_model_file_path,
      p_changed_by
    );
  end if;

  -- 返回更新后的报告
  select * into v_report from public.report where id = p_report_id;
  return v_report;
end;
$$;
