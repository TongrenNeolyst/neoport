-- =============================================================================
-- 通用扩展与共享辅助函数
-- =============================================================================
-- 说明：所有数据库初始化脚本的前置依赖，提供常用扩展和公共触发器函数。
-- 依赖：无需外部依赖，可最先执行。
-- =============================================================================

create extension if not exists pgcrypto;  -- 提供 gen_random_uuid() 和加密函数
create extension if not exists citext;     -- 提供大小写不敏感的文本类型，用于邮箱等

-- 自动更新 updated_at 字段的触发器函数（UTC 时间）
-- 使用方式：在目标表上创建 BEFORE UPDATE 触发器，FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_utc()
-- 示例：create trigger set_updated_at before update on my_table for each row execute function public.set_updated_at_utc();
create or replace function public.set_updated_at_utc()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on extension pgcrypto is '加密扩展：提供 gen_random_uuid()、digest() 等加密相关函数';
comment on extension citext is '大小写不敏感文本扩展：存储邮箱等不区分大小写的字符串';
comment on function public.set_updated_at_utc() is '自动更新 updated_at 字段为当前 UTC 时间的触发器函数，BEFORE UPDATE 时触发';
