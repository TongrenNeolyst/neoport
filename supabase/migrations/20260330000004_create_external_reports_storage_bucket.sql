-- =============================================================================
-- 外部报告 Storage Bucket 配置
-- -----------------------------------------------------------------------------
-- 用途：创建用于存储外部报告附件文件的 Supabase Storage bucket 及访问策略。
-- 路径规则：external-reports/{report_id}/{file_name}
-- 访问策略：
--   - 读取：已认证用户通过签名 URL 访问
--   - 写入/删除：仅 service_role（服务端 API）可操作
-- 文件限制：单文件最大 50MB（由 bucket 级别 file_size_limit 强制约束）
-- =============================================================================

-- 创建 external-reports bucket
-- id 和 name 均使用 'external-reports'，与内部报告的 'reports' bucket 明确区分。
-- public = false：文件不公开，需要签名 URL 或认证访问。
-- file_size_limit = 52428800 bytes = 50MB：单文件大小硬限制。
-- allowed_mime_types = null：不限制文件类型。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'external-reports',
  'external-reports',
  false,          -- 不公开，需要认证
  52428800,       -- 单文件最大 50MB
  null            -- 不限制 MIME 类型
)
on conflict (id) do nothing;  -- 幂等：已存在则跳过

-- ---------------------------------------------------------------------------
-- 读取策略（RLS）
-- ---------------------------------------------------------------------------
-- 已认证用户可以读取外部报告附件（通过签名 URL）。
create policy "Authenticated users can read external-reports"
  on storage.objects for select
  using (bucket_id = 'external-reports' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 写入策略（RLS）
-- ---------------------------------------------------------------------------
-- 仅 service_role 可以上传文件（服务端 API 使用 service role key）。
create policy "Service role can upload external-reports"
  on storage.objects for insert
  with check (bucket_id = 'external-reports' and auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 删除策略（RLS）
-- ---------------------------------------------------------------------------
-- 仅 service_role 可以删除文件（删除报告附件时由服务端触发）。
create policy "Service role can delete external-reports"
  on storage.objects for delete
  using (bucket_id = 'external-reports' and auth.role() = 'service_role');
