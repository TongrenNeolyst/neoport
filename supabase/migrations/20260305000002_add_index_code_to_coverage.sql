-- Coverage table: 添加 index_code 字段
-- 关联 index_quotes 表，用于关联对应的指数行情
-- 注意：不使用外键约束，因为一个指数可对应多只股票

-- 添加 index_code 字段：关联指数代码
alter table public.coverage
add column if not exists index_code text;

-- 字段注释
comment on column public.coverage.index_code is '关联的指数代码，关联 index_quotes 表的 index_code';

-- 索引：支持按 index_code 查询
create index if not exists idx_coverage_index_code on public.coverage(index_code);
