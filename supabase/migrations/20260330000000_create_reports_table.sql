-- =============================================================================
-- 外部报告主表 reports
-- -----------------------------------------------------------------------------
-- 用途：存储从外部系统推送过来的已发布报告，与内部报告管理表（report/report_version）完全解耦。
-- 生命周期：仅存储和展示，不参与内部报告的草稿→提交→发布工作流。
-- 特性：不允许物理删除（无 DELETE），通过 external_id 唯一约束保证幂等。
-- =============================================================================

create table if not exists reports (
  -- ---------------------------------------------------------------------------
  -- 主键
  -- ---------------------------------------------------------------------------
  id            uuid        primary key default gen_random_uuid(),

  -- ---------------------------------------------------------------------------
  -- 外部系统标识（幂等键）
  -- ---------------------------------------------------------------------------
  -- 外部系统生成的唯一标识，用于幂等去重。
  -- 接口推送时若 external_id 已存在，返回 200 而非 201。
  external_id   text        not null unique,

  -- ---------------------------------------------------------------------------
  -- 报告基本信息
  -- ---------------------------------------------------------------------------
  -- 报告标题，必填，最大 500 字符。
  title         text        not null,

  -- 报告类型（如 sector/company/industry），必填，最大 100 字符。
  -- 由外部系统指定，与内部 report_type 概念一致但来源不同。
  report_type   text        not null,

  -- 公司股票代码，最大 50 字符。可空。
  ticker        text,

  -- ---------------------------------------------------------------------------
  -- 评级与目标价
  -- ---------------------------------------------------------------------------
  -- 评级（如 Buy/Hold/Sell），最大 100 字符，可空。
  rating        text,

  -- 目标价，numeric 类型，允许小数。可空。
  -- CHECK 约束保证 target_price > 0（当非空时）。
  target_price  numeric,

  -- ---------------------------------------------------------------------------
  -- 分类与地区
  -- ---------------------------------------------------------------------------
  -- 行业分类名称，最大 200 字符，可空。
  -- 注意：此处为文本而非外键关联 sector 表，由外部系统传入。
  sector        text,

  -- 地区名称，最大 100 字符，可空。
  -- 注意：此处为文本而非外键关联 region 表，由外部系统传入。
  region        text,

  -- ---------------------------------------------------------------------------
  -- 语言与内容
  -- ---------------------------------------------------------------------------
  -- 报告语言，仅允许 'zh'（中文）或 'en'（英文），可空。
  -- CHECK 约束在数据库层面限制枚举值。
  report_language text,

  -- 投资摘要/报告摘要，最大 5000 字符，可空。
  investment_thesis text,

  -- ---------------------------------------------------------------------------
  -- 分析师与联系人（原始值）
  -- ---------------------------------------------------------------------------
  -- 报告第一作者的名字（不含邮箱），可空。
  -- 完整邮箱列表保存在 report_analyst 关联表中。
  analyst       text,

  -- 报告联系人的名字（不含邮箱），可空。
  -- 完整邮箱保存在 report_contact 关联表中。
  contact_person text,

  -- ---------------------------------------------------------------------------
  -- 时间戳
  -- ---------------------------------------------------------------------------
  -- 报告发布时间，必填。时区-aware。
  published_at  timestamptz not null,

  -- 创建时间和最后更新时间，均使用 UTC 时区。
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- ---------------------------------------------------------------------------
  -- 约束
  -- ---------------------------------------------------------------------------
  -- target_price > 0（当非空时），不允许负数或零目标价。
  constraint reports_target_price_positive check (target_price is null or target_price > 0),
  -- report_language 枚举限制：仅允许 'zh' 或 'en'。
  constraint reports_language_check check (report_language is null or report_language in ('zh', 'en'))
);

-- external_id 唯一索引，加速幂等查重（已由 unique 约束隐式创建，此处显式声明）
create index if not exists idx_reports_external_id on reports (external_id);
-- 按发布时间倒序索引，便于查询最新报告
create index if not exists idx_reports_published_at on reports (published_at desc);

-- 自动更新 updated_at 触发器（复用公共函数 set_updated_at_utc）
create or replace trigger set_updated_at
  before update on reports
  for each row execute function public.set_updated_at_utc();

-- ============================================================================
-- 表与字段注释
-- ============================================================================

comment on table public.reports is '外部报告主表：存储从外部系统推送过来的已发布报告，与内部报告管理表（report/report_version）完全解耦，仅存储和展示';
comment on column public.reports.id is '主键 UUID，由 gen_random_uuid() 自动生成';
comment on column public.reports.external_id is '外部系统生成的唯一标识，用于幂等去重；推送时若已存在返回 200 而非 201';
comment on column public.reports.title is '报告标题，必填，最大 500 字符';
comment on column public.reports.report_type is '报告类型（如 sector/company/industry），必填，最大 100 字符，由外部系统指定';
comment on column public.reports.ticker is '公司股票代码，最大 50 字符，可为空';
comment on column public.reports.rating is '评级（如 Buy/Hold/Sell），最大 100 字符，可为空';
comment on column public.reports.target_price is '目标价，numeric 类型，允许小数；CHECK 约束保证 > 0（当非空时）';
comment on column public.reports.sector is '行业分类名称，最大 200 字符，可为空；注意：此处为文本而非外键关联，由外部系统传入';
comment on column public.reports.region is '地区名称，最大 100 字符，可为空；注意：此处为文本而非外键关联，由外部系统传入';
comment on column public.reports.report_language is '报告语言，仅允许 zh（中文）或 en（英文），可为空';
comment on column public.reports.investment_thesis is '投资摘要/报告摘要，最大 5000 字符，可为空';
comment on column public.reports.analyst is '报告第一作者的名字（不含邮箱），可为空；完整邮箱列表保存在 report_analyst 关联表中';
comment on column public.reports.contact_person is '报告联系人的名字（不含邮箱），可为空；完整邮箱保存在 report_contact 关联表中';
comment on column public.reports.published_at is '报告发布时间，必填，UTC 时区';
comment on column public.reports.created_at is '记录创建时间，UTC 时区';
comment on column public.reports.updated_at is '最后更新时间，UTC 时区，由触发器自动维护';
