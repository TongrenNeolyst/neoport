-- Index Quotes table: 指数行情表
-- 用于保存指数的每日行情数据，如上证指数、深证成指、恒生指数等
-- 数据来源：每日从外部行情数据接口同步

create table if not exists public.index_quotes (
  id uuid primary key default gen_random_uuid(),
  -- 指数代码，如 "000001"（上证指数）、"399001"（深证成指）、"HSI"（恒生指数）等
  index_code text not null,
  -- 指数名称，如 "上证指数"、"深证成指"、"恒生指数"等
  index_name text not null,
  -- 交易日，格式为 YYYY-MM-DD
  trade_date date not null,
  -- 收盘价/收盘点位
  close_price numeric(18, 4),
  -- 记录创建时间
  created_at timestamptz not null default now()
);

-- 表注释
comment on table public.index_quotes is '指数行情表：存储指数的每日行情数据';

-- 字段注释
comment on column public.index_quotes.id is '主键UUID';
comment on column public.index_quotes.index_code is '指数代码';
comment on column public.index_quotes.index_name is '指数名称';
comment on column public.index_quotes.trade_date is '交易日';
comment on column public.index_quotes.close_price is '收盘价/收盘点位';
comment on column public.index_quotes.created_at is '创建时间';

-- 索引：支持按指数代码查询、按日期范围查询
create index if not exists idx_index_quotes_code on public.index_quotes(index_code);
create index if not exists idx_index_quotes_trade_date on public.index_quotes(trade_date);
create index if not exists idx_index_quotes_code_date on public.index_quotes(index_code, trade_date);

-- 唯一约束：同一指数在同一交易日只有一条记录
alter table public.index_quotes add constraint uk_index_quotes_code_date unique (index_code, trade_date);

alter table public.index_quotes enable row level security;

-- SELECT 权限：所有用户可读
drop policy if exists index_quotes_select_all on public.index_quotes;
create policy index_quotes_select_all
on public.index_quotes
for select
to anon, authenticated
using (true);

-- INSERT 权限：所有用户可写入
drop policy if exists index_quotes_insert_all on public.index_quotes;
create policy index_quotes_insert_all
on public.index_quotes
for insert
to anon, authenticated
with check (true);

-- UPDATE 权限：所有用户可更新
drop policy if exists index_quotes_update_all on public.index_quotes;
create policy index_quotes_update_all
on public.index_quotes
for update
to anon, authenticated
using (true);

-- DELETE 权限：所有用户可删除
drop policy if exists index_quotes_delete_all on public.index_quotes;
create policy index_quotes_delete_all
on public.index_quotes
for delete
to anon, authenticated
using (true);
