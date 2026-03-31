-- =============================================================================
-- 外部报告联系人关联表 report_contact
-- -----------------------------------------------------------------------------
-- 用途：存储外部报告与联系人邮箱的关联关系。
-- 背景：接口接收 contact_person 字段格式为 "名字<邮箱>"，
--       名字保存到 reports.contact_person，
--       邮箱保存到本表。
-- 特性：
--   - citext 类型：邮箱不区分大小写
--   - (report_id, contact_email) 唯一约束：防止同一报告重复关联同一邮箱
--   - on delete cascade：删除报告时自动清理关联关系
-- =============================================================================

create table if not exists report_contact (
  -- ---------------------------------------------------------------------------
  -- 主键
  -- ---------------------------------------------------------------------------
  id            uuid        primary key default gen_random_uuid(),

  -- ---------------------------------------------------------------------------
  -- 关联到外部报告
  -- ---------------------------------------------------------------------------
  -- 关联到 reports.id。
  -- on delete cascade：删除报告时自动删除该报告的所有联系人关联记录。
  report_id     uuid        not null references reports(id) on delete cascade,

  -- ---------------------------------------------------------------------------
  -- 联系人邮箱
  -- ---------------------------------------------------------------------------
  -- citext：大小写不敏感的文本类型，用于存储邮箱。
  contact_email citext      not null,

  -- ---------------------------------------------------------------------------
  -- 审计字段
  -- ---------------------------------------------------------------------------
  created_at    timestamptz not null default now(),

  -- ---------------------------------------------------------------------------
  -- 约束
  -- ---------------------------------------------------------------------------
  -- 唯一约束：同一报告不允许重复关联同一个联系人邮箱。
  constraint uq_report_contact_report_email unique (report_id, contact_email)
);

-- report_id 索引，加速按报告查询关联联系人
create index if not exists idx_report_contact_report_id on report_contact (report_id);
-- contact_email 索引，支持按邮箱查询
create index if not exists idx_report_contact_email on report_contact (contact_email);

-- ============================================================================
-- 表与字段注释
-- ============================================================================

comment on table public.report_contact is '外部报告联系人关联表：存储外部报告与联系人邮箱的关联关系；接口传入格式为"名字<邮箱>"，名字存 reports.contact_person，邮箱存本表';
comment on column public.report_contact.id is '主键 UUID';
comment on column public.report_contact.report_id is '关联的报告 ID，关联 reports.id；删除报告时自动级联删除关联记录';
comment on column public.report_contact.contact_email is '联系人邮箱，citext 类型（大小写不敏感）';
comment on column public.report_contact.created_at is '关联创建时间，UTC 时区';
