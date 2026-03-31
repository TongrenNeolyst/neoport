-- =============================================================================
-- 外部报告分析师关联表 report_analyst
-- -----------------------------------------------------------------------------
-- 用途：存储外部报告与分析师邮箱的多对多关联关系。
-- 背景：接口接收 analyst 字段格式为 "名字<邮箱>,名字<邮箱>"，
--       第一个分析师的名字保存到 reports.analyst，
--       所有邮箱分别保存到本表，每行一个邮箱。
-- 特性：
--   - citext 类型：邮箱不区分大小写（zhangsan@ex.com 与 ZhangSan@ex.com 视为相同）
--   - (report_id, analyst_email) 唯一约束：防止同一报告重复关联同一邮箱
--   - on delete cascade：删除报告时自动清理关联关系
-- 与现有 report_analyst 表的区别：
--   - 现有 report_analyst 表的 analyst_id 关联到 analyst.id（内部分析师）
--   - 本表的 analyst_email 为文本，不强制关联 analyst.id（外部分析师）
-- =============================================================================

create table if not exists report_analyst (
  -- ---------------------------------------------------------------------------
  -- 主键
  -- ---------------------------------------------------------------------------
  id            uuid        primary key default gen_random_uuid(),

  -- ---------------------------------------------------------------------------
  -- 关联到外部报告
  -- ---------------------------------------------------------------------------
  -- 关联到 reports.id。
  -- on delete cascade：删除报告时自动删除该报告的所有分析师关联记录。
  report_id     uuid        not null references reports(id) on delete cascade,

  -- ---------------------------------------------------------------------------
  -- 分析师邮箱
  -- ---------------------------------------------------------------------------
  -- citext：大小写不敏感的文本类型，用于存储邮箱。
  -- 不强制关联到 analyst.id —— 外部系统推送的分析师未必在本地 analyst 表中有记录。
  analyst_email citext      not null,

  -- ---------------------------------------------------------------------------
  -- 审计字段
  -- ---------------------------------------------------------------------------
  created_at    timestamptz not null default now(),

  -- ---------------------------------------------------------------------------
  -- 约束
  -- ---------------------------------------------------------------------------
  -- 唯一约束：同一报告不允许重复关联同一个邮箱。
  constraint uq_report_analyst_report_email unique (report_id, analyst_email)
);

-- report_id 索引，加速按报告查询关联分析师
create index if not exists idx_report_analyst_report_id on report_analyst (report_id);
-- analyst_email 索引，支持按邮箱查询（查询某分析师参与的所有外部报告）
create index if not exists idx_report_analyst_email on report_analyst (analyst_email);

-- ============================================================================
-- 表与字段注释
-- ============================================================================

comment on table public.report_analyst is '外部报告分析师关联表：存储外部报告与分析师邮箱的多对多关系；注意：此处为外部分析师，与内部分析师表（analyst）解耦';
comment on column public.report_analyst.id is '主键 UUID';
comment on column public.report_analyst.report_id is '关联的报告 ID，关联 reports.id；删除报告时自动级联删除关联记录';
comment on column public.report_analyst.analyst_email is '分析师邮箱，citext 类型（大小写不敏感）；不强制关联 analyst.id，外部分析师未必在本地有记录';
comment on column public.report_analyst.created_at is '关联创建时间，UTC 时区';
