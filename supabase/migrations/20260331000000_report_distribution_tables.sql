-- =============================================================================
-- 报告自动分发系统数据库表结构
-- =============================================================================
-- 功能说明：
--   1. 邮件订阅管理 - 存储订阅者的邮箱和订阅类型
--   2. SMTP 配置管理 - 存储邮件发送服务器配置
--   3. 分发队列管理 - 管理待分发的报告任务
--   4. 分发历史记录 - 记录每封邮件的发送结果
--
-- 分发流程：
--   1. POST /api/external/reports 接收报告成功 -> 调用 add_to_distribution_queue(report_id) 加入队列（status=waiting）
--   2. 定时任务（每5分钟）-> 扫描 waiting 状态的队列记录
--   3. 获取报告内容和收件人列表（分析师 + 联系人 + Wind/同花顺/普通订阅者）
--   4. 下载报告附件，通过 SMTP 发送邮件
--   5. 每封邮件写入 report_distribution_history
--   6. 全部成功 -> status=published；任意失败 -> status=failed
--
-- 订阅类型（subscription_type）：
--   - normal: 普通第三方订阅者
--   - wind: Wind 订阅者
--   - tonghuashun: 同花顺订阅者
--
-- 队列状态（status）：
--   - waiting: 等待发布（初始状态，由外部 API 接收报告后自动写入）
--   - processing: 处理中（定时任务执行中，防止并发重复执行）
--   - published: 已发布（所有邮件发送成功）
--   - failed: 发送失败（部分或全部邮件发送失败）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 邮件订阅表 (email_subscription)
-- -----------------------------------------------------------------------------
-- 用途：存储所有邮件订阅者信息，包括普通订阅者、Wind、同花顺
-- 说明：
--   - 每个邮箱只能订阅一次（unique 约束）
--   - 可关联到系统用户（user_id），便于用户管理自己的订阅
--   - subscription_type 区分订阅类型，决定是否接收该报告
--   - is_active 控制订阅是否生效（禁用但不删除，方便重新启用）

create table if not exists public.email_subscription (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID，自动生成
  email varchar(255) not null unique,                   -- 订阅邮箱，唯一约束防止重复订阅
  user_id uuid references auth.users(id) on delete set null, -- 关联的系统用户 ID（可选；删除用户时保留订阅记录）
  created_at timestamptz not null default now(),        -- 订阅时间
  is_active boolean not null default true,               -- 是否启用（false 表示暂停接收邮件，不删除记录）
  subscription_type varchar(50) not null default 'normal' check (subscription_type in ('normal', 'wind', 'tonghuashun')) -- 订阅类型：普通/Wind/同花顺
);

-- 索引：按邮箱查询（已唯一约束，自动索引）
create index if not exists idx_email_subscription_email on public.email_subscription(email);
-- 索引：按用户 ID 查询（查找某用户的订阅）
create index if not exists idx_email_subscription_user on public.email_subscription(user_id);
-- 索引：按订阅类型查询（查找某类别的所有订阅者）
create index if not exists idx_email_subscription_type on public.email_subscription(subscription_type);
-- 索引：按是否启用查询（过滤活跃订阅者）
create index if not exists idx_email_subscription_active on public.email_subscription(is_active);

-- 表注释
comment on table public.email_subscription is '邮件订阅表：存储所有邮件订阅者，包括普通第三方订阅者、Wind 订阅者、同花顺订阅者';
comment on column public.email_subscription.id is '主键 UUID';
comment on column public.email_subscription.email is '订阅邮箱地址';
comment on column public.email_subscription.user_id is '关联的系统用户 ID（可选，删除用户时保留订阅记录）';
comment on column public.email_subscription.created_at is '订阅时间';
comment on column public.email_subscription.is_active is '是否启用（false = 暂停接收，不删除记录）';
comment on column public.email_subscription.subscription_type is '订阅类型：normal=普通第三方，wind=Wind，tonghuashun=同花顺';

-- -----------------------------------------------------------------------------
-- 2. 邮件配置表 (email_config)
-- -----------------------------------------------------------------------------
-- 用途：存储 SMTP 服务器配置，供定时任务发送邮件使用
-- 说明：
--   - 只使用一条配置记录（由前端页面管理）
--   - is_enabled 控制是否启用；定时任务读取时仅使用启用状态的配置
--   - smtp_pass 以明文存储，生产环境建议加密或使用密钥管理服务

create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  smtp_host varchar(255) not null,                     -- SMTP 服务器地址，如 smtp.office365.com
  smtp_port integer not null default 25,                 -- SMTP 端口，常用值：25（明文）、587（TLS）、465（SSL）
  smtp_user varchar(255) not null,                      -- SMTP 用户名
  smtp_pass varchar(255) not null,                       -- SMTP 密码/授权码
  smtp_from varchar(255) not null,                       -- 发件人邮箱地址
  is_enabled boolean not null default false,              -- 是否启用（false 时定时任务不使用此配置）
  updated_at timestamptz not null default now()          -- 配置更新时间（便于追踪变更历史）
);

-- 表注释
comment on table public.email_config is '邮件配置表：存储 SMTP 服务器配置，由 Admin 通过 /email-config 页面管理';
comment on column public.email_config.id is '主键 UUID';
comment on column public.email_config.smtp_host is 'SMTP 服务器地址，如 smtp.office365.com';
comment on column public.email_config.smtp_port is 'SMTP 端口，常用值：25/587/465';
comment on column public.email_config.smtp_user is 'SMTP 用户名';
comment on column public.email_config.smtp_pass is 'SMTP 密码或授权码';
comment on column public.email_config.smtp_from is '发件人邮箱地址';
comment on column public.email_config.is_enabled is '是否启用（false 时定时任务不使用此配置）';
comment on column public.email_config.updated_at is '配置更新时间';

-- -----------------------------------------------------------------------------
-- 3. 报告分发队列表 (report_distribution_queue)
-- -----------------------------------------------------------------------------
-- 用途：管理待分发的报告任务，每条记录对应一个报告的外发任务
-- 说明：
--   - 每份报告有且仅有一条队列记录（由外部 API 接收报告时自动写入）
--   - status 流转：waiting -> processing -> published/failed
--   - scheduled_at 目前固定为 now()，预留用于延迟发送
--   - sent_at 记录实际完成时间，便于追踪发送延迟
--   - report_id 级联删除：报告删除时自动清理队列记录

create table if not exists public.report_distribution_queue (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  report_id uuid not null references public.reports(id) on delete cascade, -- 关联的报告 ID，报告删除时级联删除队列记录
  status varchar(50) not null default 'waiting' check (status in ('waiting', 'processing', 'published', 'failed')), -- 分发状态
  error_message text,                                    -- 失败原因（当 status=failed 时记录，供排查用）
  scheduled_at timestamptz not null default now(),       -- 计划分发时间（预留字段，当前固定为 now()）
  sent_at timestamptz,                                  -- 实际完成时间（当 status=published 时填写）
  created_at timestamptz not null default now()          -- 记录创建时间
);

-- 索引：按状态查询（定时任务轮询 waiting 状态）
create index if not exists idx_report_distribution_queue_status on public.report_distribution_queue(status);
-- 索引：按报告 ID 查询（查找某报告的队列状态）
create index if not exists idx_report_distribution_queue_report on public.report_distribution_queue(report_id);

-- 表注释
comment on table public.report_distribution_queue is '报告分发队列表：每条记录对应一个报告的外发任务，状态流转 waiting->processing->published/failed';
comment on column public.report_distribution_queue.id is '主键 UUID';
comment on column public.report_distribution_queue.report_id is '关联的报告 ID，关联 reports.id';
comment on column public.report_distribution_queue.status is '分发状态：waiting=等待发布，processing=处理中，published=已发布，failed=发送失败';
comment on column public.report_distribution_queue.error_message is '失败原因（status=failed 时记录，供排查）';
comment on column public.report_distribution_queue.scheduled_at is '计划分发时间（预留字段，当前固定为 now()）';
comment on column public.report_distribution_queue.sent_at is '实际完成时间（status=published 时填写）';
comment on column public.report_distribution_queue.created_at is '记录创建时间';

-- -----------------------------------------------------------------------------
-- 4. 报告分发历史表 (report_distribution_history)
-- -----------------------------------------------------------------------------
-- 用途：记录每封邮件的发送明细，供追踪、排查和统计
-- 说明：
--   - 每封邮件一条记录（成功或失败各一条）
--   - 与 reports 级联删除：报告删除时自动清理历史
--   - 可用于统计发送成功率、重试失败的发送

create table if not exists public.report_distribution_history (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  report_id uuid not null references public.reports(id) on delete cascade, -- 关联的报告 ID
  recipient_email varchar(255) not null,                  -- 收件人邮箱
  status varchar(50) not null check (status in ('sent', 'failed')), -- 发送状态：sent=发送成功，failed=发送失败
  sent_at timestamptz,                                  -- 发送成功时间（status=sent 时填写，failed 时可为空）
  error_message text,                                    -- 发送失败原因（SMTP 错误信息）
  created_at timestamptz not null default now()          -- 记录创建时间
);

-- 索引：按报告 ID 查询（查看某报告的发送历史）
create index if not exists idx_report_distribution_history_report on public.report_distribution_history(report_id);
-- 索引：按收件人邮箱查询（查看某邮箱的接收历史）
create index if not exists idx_report_distribution_history_email on public.report_distribution_history(recipient_email);

-- 表注释
comment on table public.report_distribution_history is '报告分发历史表：记录每封邮件的发送明细，包括成功和失败，供追踪排查和统计发送成功率';
comment on column public.report_distribution_history.id is '主键 UUID';
comment on column public.report_distribution_history.report_id is '关联的报告 ID';
comment on column public.report_distribution_history.recipient_email is '收件人邮箱地址';
comment on column public.report_distribution_history.status is '发送状态：sent=发送成功，failed=发送失败';
comment on column public.report_distribution_history.sent_at is '发送成功时间（status=sent 时填写）';
comment on column public.report_distribution_history.error_message is '发送失败原因（SMTP 错误信息）';
comment on column public.report_distribution_history.created_at is '记录创建时间';

-- =============================================================================
-- 辅助函数（必须在 RLS 策略之前定义，因为策略中引用了此函数）
-- =============================================================================

-- 从 JWT app_metadata 提取当前用户角色
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '');
$$;

-- 将报告添加到分发队列（初始状态 = waiting）
create or replace function public.add_to_distribution_queue(p_report_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.report_distribution_queue (report_id, status)
  values (p_report_id, 'waiting')
  on conflict do nothing;
end;
$$;

-- =============================================================================
-- 行级安全策略 (RLS)
-- =============================================================================
-- 说明：启用行级安全策略，控制不同角色对数据的访问权限
--   - Admin：可读写所有表
--   - 普通用户：可管理自己的订阅（email_subscription）
--   - 其他用户：仅可查看，无写入权限

alter table public.email_subscription enable row level security;
alter table public.email_config enable row level security;
alter table public.report_distribution_queue enable row level security;
alter table public.report_distribution_history enable row level security;

-- email_subscription: 管理员或订阅者本人可操作
drop policy if exists email_subscription_select_policy on public.email_subscription;
create policy email_subscription_select_policy
on public.email_subscription
for select
to authenticated
using (public.current_app_role() = 'admin' or user_id = auth.uid());

drop policy if exists email_subscription_insert_policy on public.email_subscription;
create policy email_subscription_insert_policy
on public.email_subscription
for insert
to authenticated
with check (public.current_app_role() = 'admin' or user_id = auth.uid());

drop policy if exists email_subscription_update_policy on public.email_subscription;
create policy email_subscription_update_policy
on public.email_subscription
for update
to authenticated
using (public.current_app_role() = 'admin' or user_id = auth.uid())
with check (public.current_app_role() = 'admin' or user_id = auth.uid());

drop policy if exists email_subscription_delete_policy on public.email_subscription;
create policy email_subscription_delete_policy
on public.email_subscription
for delete
to authenticated
using (public.current_app_role() = 'admin' or user_id = auth.uid());

-- email_config: 仅管理员
drop policy if exists email_config_select_policy on public.email_config;
create policy email_config_select_policy
on public.email_config
for select
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists email_config_insert_policy on public.email_config;
create policy email_config_insert_policy
on public.email_config
for insert
to authenticated
with check (public.current_app_role() = 'admin');

drop policy if exists email_config_update_policy on public.email_config;
create policy email_config_update_policy
on public.email_config
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- report_distribution_queue: 仅管理员
drop policy if exists report_distribution_queue_select_policy on public.report_distribution_queue;
create policy report_distribution_queue_select_policy
on public.report_distribution_queue
for select
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists report_distribution_queue_insert_policy on public.report_distribution_queue;
create policy report_distribution_queue_insert_policy
on public.report_distribution_queue
for insert
to authenticated
with check (public.current_app_role() = 'admin');

drop policy if exists report_distribution_queue_update_policy on public.report_distribution_queue;
create policy report_distribution_queue_update_policy
on public.report_distribution_queue
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- report_distribution_history: 仅管理员
drop policy if exists report_distribution_history_select_policy on public.report_distribution_history;
create policy report_distribution_history_select_policy
on public.report_distribution_history
for select
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists report_distribution_history_insert_policy on public.report_distribution_history;
create policy report_distribution_history_insert_policy
on public.report_distribution_history
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- 函数注释
comment on function public.add_to_distribution_queue(uuid) is '将报告添加到自动分发队列，初始状态为 waiting；幂等操作，重复调用不会产生重复记录';
comment on function public.current_app_role() is '从 JWT app_metadata 提取当前用户角色，返回 admin/sa/analyst 或空字符串';
