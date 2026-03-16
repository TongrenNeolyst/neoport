-- Function to get user's full name from auth.users table

create or replace function public.get_user_full_name(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  select raw_user_meta_data->>'full_name'
    into v_full_name
  from auth.users
  where id = p_user_id;

  return v_full_name;
end;
$$;
