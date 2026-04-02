-- =============================================================================
-- reports 表新增 ticker_name 字段
-- 用途：存储股票英文简称
-- =============================================================================

alter table public.reports
  add column if not exists ticker_name text;

comment on column public.reports.ticker_name is '股票英文简称，最大 50 字符，可为空';
