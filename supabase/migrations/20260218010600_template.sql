-- Template table, indexes, trigger, RLS, and templates storage bucket policies.

create table if not exists public.template (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null,
  file_type text not null check (file_type in ('word', 'excel')),
  file_path text not null,
  version integer not null check (version >= 1),
  is_active boolean not null default false,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_uniq_version unique (report_type, file_type, version)
);

create unique index if not exists uidx_template_active_one
  on public.template(report_type, file_type)
  where is_active = true;
create index if not exists idx_template_group
  on public.template(report_type, file_type);
create index if not exists idx_template_created_at_desc
  on public.template(created_at desc);

drop trigger if exists trg_template_updated_at on public.template;
create trigger trg_template_updated_at
before update on public.template
for each row execute function public.set_updated_at_utc();

alter table public.template enable row level security;

drop policy if exists template_select_authenticated on public.template;
create policy template_select_authenticated
on public.template
for select
to authenticated
using (true);

drop policy if exists template_write_admin on public.template;
create policy template_write_admin
on public.template
for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- storage bucket: templates
insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;

drop policy if exists storage_templates_select_authenticated on storage.objects;
create policy storage_templates_select_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'templates');

drop policy if exists storage_templates_insert_admin on storage.objects;
create policy storage_templates_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'templates'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

drop policy if exists storage_templates_update_admin on storage.objects;
create policy storage_templates_update_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'templates'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
)
with check (
  bucket_id = 'templates'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);

drop policy if exists storage_templates_delete_admin on storage.objects;
create policy storage_templates_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'templates'
  and (auth.jwt()->'app_metadata'->>'role') = 'admin'
);
