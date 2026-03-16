-- Chief Approve table: 首席确认附件表
-- 用于保存首席审核确认时的附件信息，如截图等
-- 每条 Report 记录对应一条首席确认附件记录

create table if not exists public.chief_approve (
  id uuid primary key default gen_random_uuid(),
  -- 关联的报告ID，指向 report 表的 id 字段
  report_id uuid not null references public.report(id) on delete cascade,
  -- 文件在存储桶中的路径，如 "approvals/uuid/filename.pdf"
  file_path text not null,
  -- 原始文件名，包括扩展名
  file_name text not null,
  -- 文件 MIME 类型，如 "application/pdf"、"image/png" 等
  file_type text not null,
  -- 记录创建时间
  created_at timestamptz not null default now()
);

-- 表注释
comment on table public.chief_approve is '首席确认附件表：存储首席审核确认时的附件信息';

-- 字段注释
comment on column public.chief_approve.id is '主键UUID';
comment on column public.chief_approve.report_id is '关联报告ID';
comment on column public.chief_approve.file_path is '文件存储路径';
comment on column public.chief_approve.file_name is '原始文件名';
comment on column public.chief_approve.file_type is '文件MIME类型';
comment on column public.chief_approve.created_at is '创建时间';

create index if not exists idx_chief_approve_report_id on public.chief_approve(report_id);
create index if not exists idx_chief_approve_created_at on public.chief_approve(created_at);

alter table public.chief_approve enable row level security;

-- 首席确认附件策略：仅报告负责人、SA 和管理员可操作
drop policy if exists chief_approve_select on public.chief_approve;
create policy chief_approve_select
on public.chief_approve
for select
to authenticated
using (
  exists (
    select 1 from public.report
    where id = chief_approve.report_id
    and owner_user_id = auth.uid()
  )
  or public.current_app_role() in ('sa', 'admin')
);

drop policy if exists chief_approve_insert on public.chief_approve;
create policy chief_approve_insert
on public.chief_approve
for insert
to authenticated
with check (
  exists (
    select 1 from public.report
    where id = chief_approve.report_id
    and owner_user_id = auth.uid()
  )
  or public.current_app_role() in ('sa', 'admin')
);

drop policy if exists chief_approve_update on public.chief_approve;
create policy chief_approve_update
on public.chief_approve
for update
to authenticated
using (
  exists (
    select 1 from public.report
    where id = chief_approve.report_id
    and owner_user_id = auth.uid()
  )
  or public.current_app_role() in ('sa', 'admin')
);

drop policy if exists chief_approve_delete on public.chief_approve;
create policy chief_approve_delete
on public.chief_approve
for delete
to authenticated
using (
  exists (
    select 1 from public.report
    where id = chief_approve.report_id
    and owner_user_id = auth.uid()
  )
  or public.current_app_role() in ('sa', 'admin')
);
