-- Sector table, hierarchy guard, indexes, trigger, and RLS.

create table if not exists public.sector (
  id uuid primary key default gen_random_uuid(),
  level smallint not null check (level in (1, 2)),
  parent_id uuid references public.sector(id) on delete restrict,
  name_en text not null,
  name_cn text,
  wind_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sector_level_parent_check check (
    (level = 1 and parent_id is null) or
    (level = 2 and parent_id is not null)
  )
);

create index if not exists idx_sector_level_parent
  on public.sector(level, parent_id);
create index if not exists idx_sector_name_en_lower
  on public.sector(lower(name_en));
create index if not exists idx_sector_active
  on public.sector(is_active);
create unique index if not exists uidx_sector_l1_name_en
  on public.sector(lower(name_en))
  where parent_id is null;
create unique index if not exists uidx_sector_l2_parent_name_en
  on public.sector(parent_id, lower(name_en))
  where parent_id is not null;

create or replace function public.validate_sector_hierarchy()
returns trigger
language plpgsql
as $$
declare
  v_parent_level smallint;
  v_parent_parent uuid;
begin
  if new.parent_id is not null and new.parent_id = new.id then
    raise exception 'sector parent cannot reference itself';
  end if;

  if new.level = 1 then
    if new.parent_id is not null then
      raise exception 'level 1 sector cannot have parent';
    end if;
    return new;
  end if;

  select s.level, s.parent_id
    into v_parent_level, v_parent_parent
  from public.sector s
  where s.id = new.parent_id;

  if not found then
    raise exception 'level 2 sector must reference an existing parent';
  end if;

  if v_parent_level <> 1 then
    raise exception 'level 2 sector parent must be level 1';
  end if;

  if v_parent_parent is not null then
    raise exception 'sector hierarchy supports only two levels';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sector_hierarchy on public.sector;
create trigger trg_sector_hierarchy
before insert or update on public.sector
for each row execute function public.validate_sector_hierarchy();

drop trigger if exists trg_sector_updated_at on public.sector;
create trigger trg_sector_updated_at
before update on public.sector
for each row execute function public.set_updated_at_utc();

alter table public.sector enable row level security;

drop policy if exists sector_select_authenticated on public.sector;
create policy sector_select_authenticated
on public.sector
for select
to authenticated
using (true);

drop policy if exists sector_write_admin on public.sector;
create policy sector_write_admin
on public.sector
for all
to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
