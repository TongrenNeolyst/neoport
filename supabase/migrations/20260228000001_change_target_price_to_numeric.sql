-- Change target_price from text to numeric

-- 1. 将 target_price 从 text 改为 numeric
alter table public.report
  alter column target_price type numeric using target_price::numeric;

-- 2. 添加 CHECK 约束（大于0）
alter table public.report
  drop constraint if exists report_target_price_check;
alter table public.report
  add constraint report_target_price_check check (target_price is null or target_price > 0);

-- 3. 更新 report_save_content_atomic 函数中 target_price 的处理
