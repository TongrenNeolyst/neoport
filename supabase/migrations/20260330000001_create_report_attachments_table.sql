-- =============================================================================
-- 外部报告附件表 report_attachments
-- -----------------------------------------------------------------------------
-- 用途：存储外部报告的附件文件元信息，物理文件存于 Supabase Storage。
-- 关联：每条记录通过 report_id 关联到 reports 表。
-- 特性：on delete cascade — 删除报告时附件元信息一并删除（Storage 文件由应用层清理）。
-- =============================================================================

create table if not exists report_attachments (
  -- ---------------------------------------------------------------------------
  -- 主键
  -- ---------------------------------------------------------------------------
  id            uuid        primary key default gen_random_uuid(),

  -- ---------------------------------------------------------------------------
  -- 关联到外部报告
  -- ---------------------------------------------------------------------------
  -- 关联到 reports.id，外键约束。
  -- on delete cascade：删除报告时自动删除该报告的所有附件元信息。
  report_id     uuid        not null references reports(id) on delete cascade,

  -- ---------------------------------------------------------------------------
  -- 文件元信息
  -- ---------------------------------------------------------------------------
  -- 原始文件名，包含扩展名（如 "行业报告2024.pdf"），必填。
  original_name text        not null,

  -- Storage 中的文件路径（如 "external-reports/{report_id}/{uuid}.pdf"），必填；文件名用 UUID 避免特殊字符问题。
  file_path     text        not null,

  -- 文件大小，单位为字节（bytes），必填。
  file_size     bigint      not null,

  -- 文件 MIME 类型（如 "application/pdf"、"application/msword"），必填。
  mime_type     text        not null,

  -- ---------------------------------------------------------------------------
  -- 审计字段
  -- ---------------------------------------------------------------------------
  -- 附件上传时间，UTC 时区。
  created_at    timestamptz not null default now()
);

-- report_id 索引，加速按报告查询附件列表
create index if not exists idx_report_attachments_report_id on report_attachments (report_id);

-- ============================================================================
-- 表与字段注释
-- ============================================================================

comment on table public.report_attachments is '外部报告附件元信息表：存储附件文件的元数据，物理文件存于 Supabase Storage external-reports bucket';
comment on column public.report_attachments.id is '主键 UUID';
comment on column public.report_attachments.report_id is '关联的报告 ID，关联 reports.id；删除报告时自动级联删除附件元信息';
comment on column public.report_attachments.original_name is '原始文件名，包含扩展名（如"行业报告2024.pdf"）';
comment on column public.report_attachments.file_path is 'Storage 中的文件路径，如 external-reports/{report_id}/{uuid}.pdf';
comment on column public.report_attachments.file_size is '文件大小，单位为字节（bytes）';
comment on column public.report_attachments.mime_type is '文件 MIME 类型，如 application/pdf、application/msword';
comment on column public.report_attachments.created_at is '附件上传时间，UTC 时区';
