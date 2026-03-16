-- Add original file name fields to report_version
alter table public.report_version
add column if not exists word_file_name text,
add column if not exists model_file_name text;
