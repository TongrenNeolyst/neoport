-- Report Type table: 报告类型表
-- 用于保存研究报告的分类信息，如"公司报告"、"行业报告"、"宏观报告"等
-- 报告类型数据为系统基础数据，通常由管理员维护

create table if not exists public.report_type (
  id uuid primary key default gen_random_uuid(),
  -- 报告类型名称（中文），如"公司报告"、"行业报告"、"宏观报告"等
  name text not null,
  -- 报告类型代码（英文），用于程序化处理，如 COMPANY、SECTOR、MACRO 等
  code text not null unique,
  -- 排序权重，数值越小排序越靠前，用于前端展示顺序
  sort integer not null default 1,
  -- 是否启用，true=启用（可使用），false=禁用（不可使用）
  is_active boolean not null default true,
  -- 记录创建时间
  created_at timestamptz not null default now()
);

-- 表注释
comment on table public.report_type is '报告类型表：存储研究报告的分类选项';

-- 字段注释
comment on column public.report_type.id is '主键UUID';
comment on column public.report_type.name is '报告类型名称（中文）';
comment on column public.report_type.code is '报告类型代码（英文）';
comment on column public.report_type.sort is '排序权重';
comment on column public.report_type.is_active is '是否启用';
comment on column public.report_type.created_at is '创建时间';

create index if not exists idx_report_type_sort on public.report_type(sort);
create index if not exists idx_report_type_code on public.report_type(code);
create index if not exists idx_report_type_is_active on public.report_type(is_active);

alter table public.report_type enable row level security;

drop policy if exists report_type_select_authenticated on public.report_type;
create policy report_type_select_authenticated
on public.report_type
for select
to authenticated
using (true);

-- 初始报告类型数据：系统默认创建的报告类型选项
-- 说明：
--   1. 公司报告 (company): 针对单个公司的研究报告
--   2. 行业报告 (sector): 针对某个行业的研究报告
--   3. 公司快评报告 (company_flash): 针对单个公司的快速点评
--   4. 行业快评报告 (sector_flash): 针对某个行业的快速点评
--   5. 宏观报告 (macro): 宏观经济相关研究报告
--   6. 策略报告 (strategy): 市场策略相关研究报告
--   7. 量化报告 (quantitative): 量化研究相关报告
--   8. 债券报告 (bond): 债券相关研究报告
insert into public.report_type (name, code, sort, is_active) values
  ('公司报告', 'company', 1, true),
  ('行业报告', 'sector', 2, true),
  ('公司快评报告', 'company_flash', 3, true),
  ('行业快评报告', 'sector_flash', 4, true),
  ('宏观报告', 'macro', 5, true),
  ('策略报告', 'strategy', 6, true),
  ('量化报告', 'quantitative', 7, true),
  ('债券报告', 'bond', 8, true)
on conflict (code) do nothing;
