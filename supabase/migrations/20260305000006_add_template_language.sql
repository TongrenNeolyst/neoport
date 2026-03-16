-- Add language field to template table

-- Add language column with default 'en'
ALTER TABLE public.template ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Add check constraint for language values
ALTER TABLE public.template DROP CONSTRAINT IF EXISTS template_language_check;
ALTER TABLE public.template ADD CONSTRAINT template_language_check CHECK (language IN ('en', 'zh'));

-- Update unique constraint to include language
ALTER TABLE public.template DROP CONSTRAINT IF EXISTS template_uniq_version;
ALTER TABLE public.template ADD CONSTRAINT template_uniq_version unique (report_type, file_type, language, version);

-- Update unique index for active template to include language
DROP INDEX IF EXISTS uidx_template_active_one;
CREATE UNIQUE INDEX uidx_template_active_one
ON public.template(report_type, file_type, language)
WHERE is_active = true;

-- Update index for grouping
DROP INDEX IF EXISTS idx_template_group;
CREATE INDEX idx_template_group
ON public.template(report_type, file_type, language);
