-- Stock Quotes table: 股票行情表
-- 用于保存股票的每日行情数据，包括收盘价、成交量、市值等信息
-- 数据来源：每日从外部行情数据接口同步

create table if not exists public.stock_quotes (
  id uuid primary key default gen_random_uuid(),
  -- 股票代码，如 "600519"（A股）、"00700"（港股）等
  code text not null,
  -- 市场代码，如 "SH"（上海）、"SZ"（深圳）、"HK"（香港）、"US"（美国）等
  mkt_code text not null,
  -- 交易日，格式为 YYYY-MM-DD
  trade_date date not null,
  -- 收盘价
  close_price numeric(18, 4),
  -- 成交量（股数）
  volume bigint,
  -- 市值，单位：十亿美元
  market_cap numeric(18, 2),
  -- 流通股数，单位：百万股
  shares_mn numeric(18, 2),
  -- 一年最高价
  year_high numeric(18, 4),
  -- 一年最低价
  year_low numeric(18, 4),
  -- 记录创建时间
  created_at timestamptz not null default now()
);

-- 表注释
comment on table public.stock_quotes is '股票行情表：存储股票的每日行情数据';

-- 字段注释
comment on column public.stock_quotes.id is '主键UUID';
comment on column public.stock_quotes.code is '股票代码';
comment on column public.stock_quotes.mkt_code is '市场代码';
comment on column public.stock_quotes.trade_date is '交易日';
comment on column public.stock_quotes.close_price is '收盘价';
comment on column public.stock_quotes.volume is '成交量';
comment on column public.stock_quotes.market_cap is '市值（十亿美元）';
comment on column public.stock_quotes.shares_mn is '流通股数（百万股）';
comment on column public.stock_quotes.year_high is '一年最高价';
comment on column public.stock_quotes.year_low is '一年最低价';
comment on column public.stock_quotes.created_at is '创建时间';

-- 索引：支持按股票代码+市场查询、按日期范围查询
create index if not exists idx_stock_quotes_code_mkt on public.stock_quotes(code, mkt_code);
create index if not exists idx_stock_quotes_trade_date on public.stock_quotes(trade_date);
create index if not exists idx_stock_quotes_code_mkt_date on public.stock_quotes(code, mkt_code, trade_date);

-- 唯一约束：同一股票在同一交易日只有一条记录
alter table public.stock_quotes add constraint uk_stock_quotes_code_mkt_date unique (code, mkt_code, trade_date);

alter table public.stock_quotes enable row level security;

-- SELECT 权限：所有用户可读
drop policy if exists stock_quotes_select_all on public.stock_quotes;
create policy stock_quotes_select_all
on public.stock_quotes
for select
to anon, authenticated
using (true);

-- INSERT 权限：所有用户可写入
drop policy if exists stock_quotes_insert_all on public.stock_quotes;
create policy stock_quotes_insert_all
on public.stock_quotes
for insert
to anon, authenticated
with check (true);

-- UPDATE 权限：所有用户可更新
drop policy if exists stock_quotes_update_all on public.stock_quotes;
create policy stock_quotes_update_all
on public.stock_quotes
for update
to anon, authenticated
using (true);

-- DELETE 权限：所有用户可删除
drop policy if exists stock_quotes_delete_all on public.stock_quotes;
create policy stock_quotes_delete_all
on public.stock_quotes
for delete
to anon, authenticated
using (true);
