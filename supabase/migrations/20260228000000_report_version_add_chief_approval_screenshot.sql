-- Add chief approval screenshot fields to report_version
alter table public.report_version
add column if not exists chief_approval_screenshot_path text,
add column if not exists chief_approval_screenshot_name text;
