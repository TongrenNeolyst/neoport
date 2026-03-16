-- Report management core tables, constraints, state machine, RLS, and storage policies.

-- helpers
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt()->'app_metadata'->>'role', '');
$$;

create or replace function public.report_status_is_valid(from_status text, to_status text)
returns boolean
language sql
immutable
as $$
  select (
    (from_status = 'draft' and to_status = 'submitted')
    or (from_status = 'submitted' and to_status in ('published', 'rejected'))
    or (from_status = 'rejected' and to_status = 'draft')
  );
$$;

create table if not exists public.report (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  report_type text not null check (report_type in ('company', 'sector', 'company_flash', 'sector_flash', 'common')),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published', 'rejected')),
  current_version_no integer not null default 0 check (current_version_no >= 0),
  coverage_id uuid references public.coverage(id) on delete set null,
  sector_id uuid references public.sector(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_report_owner on public.report(owner_user_id);
create index if not exists idx_report_status on public.report(status);
create index if not exists idx_report_updated_at_desc on public.report(updated_at desc);
create index if not exists idx_report_created_at_desc on public.report(created_at desc);

create or replace function public.report_enforce_owner_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'owner_user_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.report_enforce_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not public.report_status_is_valid(old.status, new.status) then
      raise exception 'invalid report status transition: % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_report_updated_at on public.report;
create trigger trg_report_updated_at
before update on public.report
for each row execute function public.set_updated_at_utc();

drop trigger if exists trg_report_owner_immutable on public.report;
create trigger trg_report_owner_immutable
before update on public.report
for each row execute function public.report_enforce_owner_immutable();

drop trigger if exists trg_report_status_transition on public.report;
create trigger trg_report_status_transition
before update on public.report
for each row execute function public.report_enforce_status_transition();

create table if not exists public.report_version (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report(id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  snapshot_json jsonb not null default '{}'::jsonb,
  word_file_path text,
  model_file_path text,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint report_version_uniq unique (report_id, version_no)
);

create index if not exists idx_report_version_report on public.report_version(report_id);
create index if not exists idx_report_version_report_version_desc
  on public.report_version(report_id, version_no desc);
create index if not exists idx_report_version_changed_at_desc
  on public.report_version(changed_at desc);

create table if not exists public.report_analyst (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report(id) on delete cascade,
  analyst_id uuid not null references public.analyst(id) on delete restrict,
  role smallint not null check (role between 1 and 4),
  sort_order smallint not null check (sort_order between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_analyst_uniq_pair unique (report_id, analyst_id),
  constraint report_analyst_uniq_sort unique (report_id, sort_order)
);

create index if not exists idx_report_analyst_report on public.report_analyst(report_id);
create index if not exists idx_report_analyst_analyst on public.report_analyst(analyst_id);

drop trigger if exists trg_report_analyst_updated_at on public.report_analyst;
create trigger trg_report_analyst_updated_at
before update on public.report_analyst
for each row execute function public.set_updated_at_utc();

create table if not exists public.report_status_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report(id) on delete cascade,
  from_status text not null check (from_status in ('draft', 'submitted', 'published', 'rejected')),
  to_status text not null check (to_status in ('draft', 'submitted', 'published', 'rejected')),
  action_by uuid not null references auth.users(id) on delete restrict,
  action_at timestamptz not null default now(),
  reason text,
  version_no integer not null check (version_no >= 0),
  created_at timestamptz not null default now(),
  constraint report_status_log_reject_reason_required
    check ((to_status <> 'rejected') or (reason is not null and btrim(reason) <> ''))
);

create index if not exists idx_report_status_log_report on public.report_status_log(report_id);
create index if not exists idx_report_status_log_action_at_desc
  on public.report_status_log(action_at desc);

create or replace function public.report_status_log_enforce_transition()
returns trigger
language plpgsql
as $$
begin
  if not public.report_status_is_valid(new.from_status, new.to_status) then
    raise exception 'invalid status log transition: % -> %', new.from_status, new.to_status;
  end if;
  if new.from_status = new.to_status then
    raise exception 'status log transition must change status';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_update_delete_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'append-only table: update/delete is not allowed';
end;
$$;

drop trigger if exists trg_report_version_no_update on public.report_version;
create trigger trg_report_version_no_update
before update or delete on public.report_version
for each row execute function public.prevent_update_delete_append_only();

drop trigger if exists trg_report_status_log_no_update on public.report_status_log;
create trigger trg_report_status_log_no_update
before update or delete on public.report_status_log
for each row execute function public.prevent_update_delete_append_only();

drop trigger if exists trg_report_status_log_transition on public.report_status_log;
create trigger trg_report_status_log_transition
before insert on public.report_status_log
for each row execute function public.report_status_log_enforce_transition();

alter table public.report enable row level security;
alter table public.report_version enable row level security;
alter table public.report_analyst enable row level security;
alter table public.report_status_log enable row level security;

-- report policies
drop policy if exists report_select_policy on public.report;
create policy report_select_policy
on public.report
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'sa' and status in ('draft', 'submitted', 'published', 'rejected'))
  or (public.current_app_role() = 'analyst' and owner_user_id = auth.uid())
);

drop policy if exists report_insert_policy on public.report;
create policy report_insert_policy
on public.report
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'analyst' and owner_user_id = auth.uid())
);

drop policy if exists report_update_policy on public.report;
create policy report_update_policy
on public.report
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'analyst'
    and owner_user_id = auth.uid()
    and status in ('draft', 'submitted')
  )
)
with check (
  public.current_app_role() = 'admin'
  or (
    public.current_app_role() = 'analyst'
    and owner_user_id = auth.uid()
    and status in ('draft', 'submitted')
  )
);

-- report_version policies
drop policy if exists report_version_select_policy on public.report_version;
create policy report_version_select_policy
on public.report_version
for select
to authenticated
using (
  exists (
    select 1
    from public.report r
    where r.id = report_version.report_id
      and (
        public.current_app_role() = 'admin'
        or (public.current_app_role() = 'sa' and r.status in ('submitted', 'published', 'rejected'))
        or (public.current_app_role() = 'analyst' and r.owner_user_id = auth.uid())
      )
  )
);

drop policy if exists report_version_insert_policy on public.report_version;
create policy report_version_insert_policy
on public.report_version
for insert
to authenticated
with check (
  changed_by = auth.uid()
  and exists (
    select 1
    from public.report r
    where r.id = report_version.report_id
      and (
        public.current_app_role() = 'admin'
        or (
          public.current_app_role() = 'analyst'
          and r.owner_user_id = auth.uid()
          and r.status in ('draft', 'submitted')
        )
      )
  )
);

-- report_analyst policies
drop policy if exists report_analyst_select_policy on public.report_analyst;
create policy report_analyst_select_policy
on public.report_analyst
for select
to authenticated
using (
  exists (
    select 1
    from public.report r
    where r.id = report_analyst.report_id
      and (
        public.current_app_role() = 'admin'
        or (public.current_app_role() = 'sa' and r.status in ('submitted', 'published', 'rejected'))
        or (public.current_app_role() = 'analyst' and r.owner_user_id = auth.uid())
      )
  )
);

drop policy if exists report_analyst_insert_policy on public.report_analyst;
create policy report_analyst_insert_policy
on public.report_analyst
for insert
to authenticated
with check (
  exists (
    select 1
    from public.report r
    where r.id = report_analyst.report_id
      and (
        public.current_app_role() = 'admin'
        or (
          public.current_app_role() = 'analyst'
          and r.owner_user_id = auth.uid()
          and r.status in ('draft', 'submitted')
        )
      )
  )
);

drop policy if exists report_analyst_update_policy on public.report_analyst;
create policy report_analyst_update_policy
on public.report_analyst
for update
to authenticated
using (
  exists (
    select 1
    from public.report r
    where r.id = report_analyst.report_id
      and (
        public.current_app_role() = 'admin'
        or (
          public.current_app_role() = 'analyst'
          and r.owner_user_id = auth.uid()
          and r.status in ('draft', 'submitted')
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.report r
    where r.id = report_analyst.report_id
      and (
        public.current_app_role() = 'admin'
        or (
          public.current_app_role() = 'analyst'
          and r.owner_user_id = auth.uid()
          and r.status in ('draft', 'submitted')
        )
      )
  )
);

drop policy if exists report_analyst_delete_policy on public.report_analyst;
create policy report_analyst_delete_policy
on public.report_analyst
for delete
to authenticated
using (
  exists (
    select 1
    from public.report r
    where r.id = report_analyst.report_id
      and (
        public.current_app_role() = 'admin'
        or (
          public.current_app_role() = 'analyst'
          and r.owner_user_id = auth.uid()
          and r.status in ('draft', 'submitted')
        )
      )
  )
);

-- report_status_log policies
drop policy if exists report_status_log_select_policy on public.report_status_log;
create policy report_status_log_select_policy
on public.report_status_log
for select
to authenticated
using (
  exists (
    select 1
    from public.report r
    where r.id = report_status_log.report_id
      and (
        public.current_app_role() = 'admin'
        or (public.current_app_role() = 'sa' and r.status in ('submitted', 'published', 'rejected'))
        or (public.current_app_role() = 'analyst' and r.owner_user_id = auth.uid())
      )
  )
);

drop policy if exists report_status_log_insert_policy on public.report_status_log;
create policy report_status_log_insert_policy
on public.report_status_log
for insert
to authenticated
with check (
  action_by = auth.uid()
  and (
    public.current_app_role() = 'admin'
    or (
      public.current_app_role() = 'sa'
      and from_status in ('submitted', 'rejected')
    )
    or (
      public.current_app_role() = 'analyst'
      and from_status = 'draft'
      and to_status = 'submitted'
      and exists (
        select 1
        from public.report r
        where r.id = report_status_log.report_id
          and r.owner_user_id = auth.uid()
      )
    )
  )
);

-- storage bucket: reports
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

drop policy if exists storage_reports_select_policy on storage.objects;
create policy storage_reports_select_policy
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = 'reports'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.report r
    where r.id = split_part(name, '/', 2)::uuid
      and (
        public.current_app_role() = 'admin'
        or r.owner_user_id = auth.uid()
        or (public.current_app_role() = 'sa' and r.status in ('submitted', 'published', 'rejected'))
      )
  )
);

drop policy if exists storage_reports_insert_policy on storage.objects;
create policy storage_reports_insert_policy
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = 'reports'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.report r
    where r.id = split_part(name, '/', 2)::uuid
      and (
        public.current_app_role() = 'admin'
        or r.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists storage_reports_update_policy on storage.objects;
create policy storage_reports_update_policy
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = 'reports'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.report r
    where r.id = split_part(name, '/', 2)::uuid
      and (
        public.current_app_role() = 'admin'
        or r.owner_user_id = auth.uid()
      )
  )
)
with check (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = 'reports'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.report r
    where r.id = split_part(name, '/', 2)::uuid
      and (
        public.current_app_role() = 'admin'
        or r.owner_user_id = auth.uid()
      )
  )
);

drop policy if exists storage_reports_delete_policy on storage.objects;
create policy storage_reports_delete_policy
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reports'
  and split_part(name, '/', 1) = 'reports'
  and split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
  and exists (
    select 1
    from public.report r
    where r.id = split_part(name, '/', 2)::uuid
      and (
        public.current_app_role() = 'admin'
        or r.owner_user_id = auth.uid()
      )
  )
);
