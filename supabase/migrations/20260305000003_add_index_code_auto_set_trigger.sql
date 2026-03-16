-- Coverage table: 添加自动设置 index_code 的触发器
-- 当 country_of_domicile 变化时，根据映射关系自动设置 index_code
-- 映射关系：
--   CN -> 000001.SS（上证指数）
--   HK -> 000001.SS（上证指数，港股也参考A股）
--   MO -> 000001.SS（上证指数）
--   US -> ^GSPC（标普500）
--   JP -> ^TOPX（日经225）
--   KR -> ^KS11（韩国综合指数）
--   IN -> ^NSEI（印度NIFTY 50）
--   TW -> ^TWII（台湾加权指数）

-- 创建映射函数
create or replace function public.set_coverage_index_code()
returns trigger
language plpgsql
as $$
begin
  -- 当 country_of_domicile 变化时，自动设置 index_code
  if new.country_of_domicile is distinct from old.country_of_domicile then
    case new.country_of_domicile
      when 'CN' then
        new.index_code := '000001.SS';
      when 'HK' then
        new.index_code := '000001.SS';
      when 'MO' then
        new.index_code := '000001.SS';
      when 'US' then
        new.index_code := '^GSPC';
      when 'JP' then
        new.index_code := '^TOPX';
      when 'KR' then
        new.index_code := '^KS11';
      when 'IN' then
        new.index_code := '^NSEI';
      when 'TW' then
        new.index_code := '^TWII';
      else
        new.index_code := null;
    end case;
  end if;

  return new;
end;
$$;

-- 创建触发器
drop trigger if exists trg_coverage_set_index_code on public.coverage;
create trigger trg_coverage_set_index_code
before insert or update of country_of_domicile on public.coverage
for each row
execute function public.set_coverage_index_code();

-- 函数注释
comment on function public.set_coverage_index_code() is '根据 country_of_domicile 自动设置 index_code 的触发器函数';
