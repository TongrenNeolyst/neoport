-- =============================================================================
-- 新增 Bloomberg (彭博) 订阅类型（按语言拆分）
-- =============================================================================
-- 背景：报告邮件外发需要支持彭博（Bloomberg）订阅方。Bloomberg 有两个邮箱：
--       1) 中文报告 → 中文邮箱（bloomberg_zh）
--       2) 英文报告 → 英文邮箱（bloomberg_en）
--
-- 路由逻辑（由 report.report_language 决定）：
--   - 'zh' → 仅 bloomberg_zh 订阅者收到 + 中文正文
--   - 'en' 或 null → 仅 bloomberg_en 订阅者收到 + 英文正文
-- =============================================================================

-- 放宽 email_subscription.subscription_type CHECK 约束，新增 'bloomberg_zh' / 'bloomberg_en'
alter table public.email_subscription
  drop constraint if exists email_subscription_subscription_type_check;

alter table public.email_subscription
  add constraint email_subscription_subscription_type_check
  check (subscription_type in ('normal', 'wind', 'tonghuashun', 'bloomberg_zh', 'bloomberg_en'));

-- 更新字段注释
comment on column public.email_subscription.subscription_type is
  '订阅类型：normal=普通第三方，wind=Wind，tonghuashun=同花顺，bloomberg_zh=彭博中文邮箱，bloomberg_en=彭博英文邮箱';

-- 更新表注释
comment on table public.email_subscription is
  '邮件订阅表：存储所有邮件订阅者，包括普通第三方订阅者、Wind 订阅者、同花顺订阅者、彭博（Bloomberg）中英文邮箱订阅者';
