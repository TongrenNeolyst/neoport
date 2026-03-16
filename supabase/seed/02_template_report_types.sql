-- Initialize report-type source records in template table.
-- Templates are active by default for development.
-- Each report_type has both English (en) and Chinese (zh) versions.

-- First, delete old templates that don't have language field (to fix unique constraint issue)
DELETE FROM public.template WHERE language IS NULL OR language NOT IN ('en', 'zh');

insert into public.template (
  name,
  report_type,
  file_type,
  language,
  file_path,
  version,
  is_active,
  uploaded_by
)
select
  src.name,
  src.report_type,
  'report',
  src.language,
  'templates/placeholder_' || src.report_type || '_' || src.language || '.docx',
  1,
  true,
  null
from (
  values
    ('Placeholder Company Template', 'company', 'en'),
    ('Placeholder 公司模板', 'company', 'zh'),
    ('Placeholder Sector Template', 'sector', 'en'),
    ('Placeholder 行业模板', 'sector', 'zh'),
    ('Placeholder Company Flash Template', 'company_flash', 'en'),
    ('Placeholder 公司快讯模板', 'company_flash', 'zh'),
    ('Placeholder Sector Flash Template', 'sector_flash', 'en'),
    ('Placeholder 行业快讯模板', 'sector_flash', 'zh'),
    ('Placeholder Macro Template', 'macro', 'en'),
    ('Placeholder 宏观模板', 'macro', 'zh'),
    ('Placeholder Strategy Template', 'strategy', 'en'),
    ('Placeholder 策略模板', 'strategy', 'zh'),
    ('Placeholder Quantitative Template', 'quantitative', 'en'),
    ('Placeholder 量化模板', 'quantitative', 'zh'),
    ('Placeholder Bond Template', 'bond', 'en'),
    ('Placeholder 债券模板', 'bond', 'zh')
) as src(name, report_type, language)
where not exists (
  select 1
  from public.template t
  where t.report_type = src.report_type and t.language = src.language
);
