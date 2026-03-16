-- =============================================================================
-- 报告分发系统数据库表结构
-- =============================================================================
-- 功能说明：
--   1. 邮件订阅管理 - 存储订阅者的邮箱和订阅类型
--   2. SMTP 配置管理 - 存储邮件发送服务器配置
--   3. 分发队列管理 - 管理待分发的报告任务
--   4. 分发历史记录 - 记录每封邮件的发送结果
--
-- 分发流程：
--   1. 报告审批通过后 -> 调用 add_to_distribution_queue(report_id) 加入队列
--   2. 定时任务 -> 扫描 pending 状态的队列记录
--   3. 获取报告内容和订阅者列表
--   4. 根据订阅类型生成不同的邮件主题和内容
--   5. 发送邮件并记录到 distribution_history
--
-- 订阅类型说明（subscription_type）：
--   - normal: 普通订阅
--     邮件主题: 报告标题
--   - wind: Wind订阅
--     邮件主题: 华福国际 * 报告类别 * 报告标题 * 报告日期 * 报告作者
--   - tonghuashun: 同花顺订阅
--     邮件主题: 华福国际 * 个股研究 * 股票代码 * 作者 * 报告撰写时间 * 标题
--
-- 邮件正文：统一使用报告的 Investment Thesis 字段（支持富文本）
-- 邮件附件：最新的 PDF 报告文件
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 邮件订阅表 (email_subscription)
-- -----------------------------------------------------------------------------
-- 用途：存储邮件订阅者信息
-- 说明：
--   - 每个邮箱只能订阅一次（unique 约束）
--   - 可关联到系统用户（user_id），便于用户管理自己的订阅
--   - subscription_type 字段用于区分订阅类型（在另一个 migration 中添加）
create table if not exists public.email_subscription (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  email varchar(255) not null unique,                      -- 订阅邮箱（唯一）
  user_id uuid references auth.users(id) on delete set null, -- 关联用户ID（可选）
  created_at timestamptz not null default now(),           -- 订阅时间
  is_active boolean not null default true                 -- 是否激活
);

-- 索引：加速按邮箱查询
create index if not exists idx_email_subscription_email on public.email_subscription(email);
-- 索引：加速按用户ID查询
create index if not exists idx_email_subscription_user on public.email_subscription(user_id);

-- -----------------------------------------------------------------------------
-- 2. 邮件配置表 (email_config)
-- -----------------------------------------------------------------------------
-- 用途：存储 SMTP 服务器配置
-- 说明：
--   - 支持配置多个邮件服务器（但通常只使用一个）
--   - is_enabled 字段控制是否启用该配置
--   - smtp_pass 以明文存储，生产环境建议加密
--
-- 常用 SMTP 配置示例：
--   Office 365: smtp.office365.com, 端口 587 (TLS)
--   Gmail: smtp.gmail.com, 端口 587 (TLS) 或 465 (SSL)
--   QQ邮箱: smtp.qq.com, 端口 587 (TLS)
create table if not exists public.email_config (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  smtp_host varchar(255) not null,                        -- SMTP 服务器地址
  smtp_port integer not null default 25,                  -- SMTP 端口（默认25）
  smtp_user varchar(255) not null,                        -- SMTP 用户名
  smtp_pass varchar(255) not null,                       -- SMTP 密码
  smtp_from varchar(255) not null,                       -- 发件人邮箱
  is_enabled boolean not null default false,             -- 是否启用
  updated_at timestamptz not null default now()         -- 更新时间
);

-- -----------------------------------------------------------------------------
-- 3. 报告分发队列表 (report_distribution_queue)
-- -----------------------------------------------------------------------------
-- 用途：管理待分发的报告任务
-- 说明：
--   - status 字段表示分发状态：
--     * pending: 待处理（等待定时任务扫描）
--     * processing: 处理中（定时任务正在发送）
--     * completed: 已完成（所有邮件发送成功）
--     * failed: 失败（发送过程中出现错误）
--   - scheduled_at: 计划分发时间（可延迟发送）
--   - sent_at: 实际完成时间
--
-- 使用方式：
--   添加到队列: INSERT INTO report_distribution_queue (report_id) VALUES ('uuid');
--   或调用函数: SELECT add_to_distribution_queue('uuid');
create table if not exists public.report_distribution_queue (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  report_id uuid not null references public.report(id) on delete cascade, -- 关联报告ID
  status varchar(50) not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')), -- 分发状态
  error_message text,                                     -- 错误信息（失败时记录）
  scheduled_at timestamptz not null default now(),       -- 计划分发时间
  sent_at timestamptz,                                   -- 实际完成时间
  created_at timestamptz not null default now()         -- 创建时间
);

-- 索引：加速查询待处理的队列
create index if not exists idx_report_distribution_queue_status on public.report_distribution_queue(status);
-- 索引：加速按报告ID查询
create index if not exists idx_report_distribution_queue_report on public.report_distribution_queue(report_id);

-- -----------------------------------------------------------------------------
-- 4. 报告分发历史表 (report_distribution_history)
-- -----------------------------------------------------------------------------
-- 用途：记录每封邮件的发送结果
-- 说明：
--   - 用于追踪发送给每个订阅者的邮件状态
--   - 方便排查邮件发送失败的原因
--   - 可用于统计发送成功率
create table if not exists public.report_distribution_history (
  id uuid primary key default gen_random_uuid(),          -- 主键 UUID
  report_id uuid not null references public.report(id) on delete cascade, -- 关联报告ID
  recipient_email varchar(255) not null,                   -- 收件人邮箱
  status varchar(50) not null check (status in ('sent', 'failed')), -- 发送状态
  sent_at timestamptz,                                   -- 发送时间
  error_message text,                                     -- 错误信息（失败时记录）
  created_at timestamptz not null default now()         -- 创建时间
);

-- 索引：加速按报告ID查询发送历史
create index if not exists idx_report_distribution_history_report on public.report_distribution_history(report_id);
-- 索引：加速按邮箱查询发送历史
create index if not exists idx_report_distribution_history_email on public.report_distribution_history(recipient_email);

-- =============================================================================
-- 行级安全策略 (RLS)
-- =============================================================================
-- 说明：启用行级安全策略，控制不同角色对数据的访问权限

-- 启用 RLS
alter table public.email_subscription enable row level security;
alter table public.email_config enable row level security;
alter table public.report_distribution_queue enable row level security;
alter table public.report_distribution_history enable row level security;

-- -----------------------------------------------------------------------------
-- email_subscription 策略
-- -----------------------------------------------------------------------------
-- 查询：管理员或订阅者本人可查看自己的订阅
drop policy if exists email_subscription_select_policy on public.email_subscription;
create policy email_subscription_select_policy
on public.email_subscription
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

-- 插入：管理员或已登录用户可添加订阅
drop policy if exists email_subscription_insert_policy on public.email_subscription;
create policy email_subscription_insert_policy
on public.email_subscription
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

-- 更新：管理员或订阅者本人可修改订阅
drop policy if exists email_subscription_update_policy on public.email_subscription;
create policy email_subscription_update_policy
on public.email_subscription
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
)
with check (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

-- 删除：管理员或订阅者本人可删除订阅
drop policy if exists email_subscription_delete_policy on public.email_subscription;
create policy email_subscription_delete_policy
on public.email_subscription
for delete
to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- email_config 策略（仅管理员）
-- -----------------------------------------------------------------------------
-- 查询：仅管理员可查看
drop policy if exists email_config_select_policy on public.email_config;
create policy email_config_select_policy
on public.email_config
for select
to authenticated
using (public.current_app_role() = 'admin');

-- 插入：仅管理员可添加
drop policy if exists email_config_insert_policy on public.email_config;
create policy email_config_insert_policy
on public.email_config
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- 更新：仅管理员可修改
drop policy if exists email_config_update_policy on public.email_config;
create policy email_config_update_policy
on public.email_config
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- report_distribution_queue 策略（仅管理员）
-- -----------------------------------------------------------------------------
-- 查询：仅管理员可查看
drop policy if exists report_distribution_queue_select_policy on public.report_distribution_queue;
create policy report_distribution_queue_select_policy
on public.report_distribution_queue
for select
to authenticated
using (public.current_app_role() = 'admin');

-- 插入：仅管理员可添加
drop policy if exists report_distribution_queue_insert_policy on public.report_distribution_queue;
create policy report_distribution_queue_insert_policy
on public.report_distribution_queue
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- 更新：仅管理员可修改
drop policy if exists report_distribution_queue_update_policy on public.report_distribution_queue;
create policy report_distribution_queue_update_policy
on public.report_distribution_queue
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- -----------------------------------------------------------------------------
-- report_distribution_history 策略（仅管理员）
-- -----------------------------------------------------------------------------
-- 查询：仅管理员可查看
drop policy if exists report_distribution_history_select_policy on public.report_distribution_history;
create policy report_distribution_history_select_policy
on public.report_distribution_history
for select
to authenticated
using (public.current_app_role() = 'admin');

-- 插入：仅管理员可添加（由定时任务自动写入）
drop policy if exists report_distribution_history_insert_policy on public.report_distribution_history;
create policy report_distribution_history_insert_policy
on public.report_distribution_history
for insert
to authenticated
with check (public.current_app_role() = 'admin');

-- =============================================================================
-- 辅助函数
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 函数：add_to_distribution_queue
-- -----------------------------------------------------------------------------
-- 用途：将报告添加到分发队列
-- 参数：p_report_id - 报告 UUID
-- 返回：无
-- 使用：SELECT add_to_distribution_queue('uuid');
create or replace function public.add_to_distribution_queue(p_report_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.report_distribution_queue (report_id, status)
  values (p_report_id, 'pending')
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- 函数：get_analyst_emails
-- -----------------------------------------------------------------------------
-- 用途：获取所有分析师的邮箱（用于报告发送给分析师）
-- 返回：分析师邮箱列表
-- 使用：SELECT * FROM get_analyst_emails();
create or replace function public.get_analyst_emails()
returns setof text
language sql
stable
as $$
  select email from auth.users
  where (auth.jwt()->'app_metadata'->>'role') = 'analyst'
  and email is not null;
$$;

-- -----------------------------------------------------------------------------
-- 函数：get_active_subscription_emails
-- -----------------------------------------------------------------------------
-- 用途：获取所有活跃订阅者的邮箱
-- 返回：活跃订阅者邮箱列表
-- 使用：SELECT * FROM get_active_subscription_emails();
create or replace function public.get_active_subscription_emails()
returns setof text
language sql
stable
as $$
  select email from public.email_subscription
  where is_active = true
  and email is not null;
$$;

-- =============================================================================
-- 定时任务配置（参考）
-- =============================================================================
-- 定时任务脚本：scripts/process-distribution-queue.ts
-- 执行频率：建议每5分钟执行一次
-- 执行命令：npx tsx scripts/process-distribution-queue.ts
--
-- Cron 配置示例（每5分钟）：
--   */5 * * * * cd /path/to/web && npx tsx scripts/process-distribution-queue.ts
--
-- Windows 任务计划程序：
--   程序：node
--   参数：scripts\process-distribution-queue.ts
-- =============================================================================
