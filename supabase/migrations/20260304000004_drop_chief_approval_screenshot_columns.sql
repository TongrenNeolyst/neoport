-- 删除 report_version 表的 chief_approval_screenshot 字段
-- 这些字段已迁移到 chief_approve 表

alter table public.report_version drop column if exists chief_approval_screenshot_path;
alter table public.report_version drop column if exists chief_approval_screenshot_name;
