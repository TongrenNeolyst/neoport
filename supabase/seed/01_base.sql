-- Seed preset regions
-- Run with: psql exec -f supabase/seed/regions.sql --db-url "postgresql://postgres:postgres@localhost:54322/postgres"

INSERT INTO public.region (name, code) VALUES
  ('China', 'CN'),
  ('Hong Kong', 'HK'),
  ('Japan', 'JP'),
  ('Taiwan', 'TW'),
  ('Korea', 'KR'),
  ('India', 'IN'),
  ('Macau', 'MO'),
  ('US', 'US')
ON CONFLICT DO NOTHING;
