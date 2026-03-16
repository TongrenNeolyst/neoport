-- 修改唯一索引为 (report_type, language, file_type)
-- 这样每个 Report Type + Language + File Type 组合只能有一个 active 模板

DROP INDEX IF EXISTS template_report_type_file_type_active_idx;

CREATE UNIQUE INDEX template_report_type_file_type_active_idx
ON public.template (report_type, language, file_type)
WHERE is_active = true;
