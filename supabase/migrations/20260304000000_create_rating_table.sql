-- Rating table: 投资评级表
-- 用于保存研究报告的投资评级信息，如"优于大市"、"中性"、"弱于大市"、"未评级"等
-- 评级数据为系统基础数据，通常由管理员维护

create table if not exists public.rating (
  id uuid primary key default gen_random_uuid(),
  -- 评级名称（中文），如"优于大市"、"中性"等
  name text not null,
  -- 评级代码（英文缩写），用于程序化处理，如 OUTPERFORM、NEUTRAL 等
  code text not null unique,
  -- 排序权重，数值越小排序越靠前，用于前端展示顺序
  sort integer not null default 1,
  -- 是否启用，true=启用（可使用），false=禁用（不可使用）
  is_active boolean not null default true,
  -- 记录创建时间
  created_at timestamptz not null default now()
);

-- 表注释
comment on table public.rating is '投资评级表：存储研究报告的投资评级选项';

-- 字段注释
comment on column public.rating.id is '主键UUID';
comment on column public.rating.name is '评级名称（中文）';
comment on column public.rating.code is '评级代码（英文缩写）';
comment on column public.rating.sort is '排序权重';
comment on column public.rating.is_active is '是否启用';
comment on column public.rating.created_at is '创建时间';

create index if not exists idx_rating_sort on public.rating(sort);
create index if not exists idx_rating_code on public.rating(code);
create index if not exists idx_rating_is_active on public.rating(is_active);

alter table public.rating enable row level security;

drop policy if exists rating_select_authenticated on public.rating;
create policy rating_select_authenticated
on public.rating
for select
to authenticated
using (true);

-- 初始评级数据：系统默认创建的评级选项
-- 说明：
--   1. 优于大市 (OUTPERFORM): 表示投资标的业绩优于市场平均水平
--   2. 中性 (NEUTRAL): 表示投资标的业绩与市场平均水平相当
--   3. 弱于大市 (UNDERPERFORM): 表示投资标的业绩低于市场平均水平
--   4. 未评级 (NON_RATED): 表示尚未给出评级
insert into public.rating (name, code, sort, is_active) values
  ('优于大市', 'OUTPERFORM', 1, true),
  ('中性', 'NEUTRAL', 2, true),
  ('弱于大市', 'UNDERPERFORM', 3, true),
  ('未评级', 'NON_RATED', 4, true)
on conflict (code) do nothing;
