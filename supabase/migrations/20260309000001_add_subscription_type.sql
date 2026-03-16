-- Add subscription_type to email_subscription table
-- Subscription types: normal (普通订阅), wind (Wind), tonghuashun (同花顺)

alter table public.email_subscription
add column if not exists subscription_type varchar(50) not null default 'normal' check (subscription_type in ('normal', 'wind', 'tonghuashun'));

-- Create index for subscription_type
create index if not exists idx_email_subscription_type on public.email_subscription(subscription_type);

-- Update RLS policies to handle subscription_type
drop policy if exists email_subscription_select_policy on public.email_subscription;
create policy email_subscription_select_policy
on public.email_subscription
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

drop policy if exists email_subscription_insert_policy on public.email_subscription;
create policy email_subscription_insert_policy
on public.email_subscription
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

drop policy if exists email_subscription_update_policy on public.email_subscription;
create policy email_subscription_update_policy
on public.email_subscription
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
)
with check (
  public.current_app_role() = 'admin'
  or user_id = auth.uid()
);

-- Add helper function to get subscriptions by type
create or replace function public.get_subscriptions_by_type(p_subscription_type varchar)
returns setof text
language sql
stable
as $$
  select email from public.email_subscription
  where is_active = true
  and subscription_type = p_subscription_type
  and email is not null;
$$;

-- Add helper function to get all subscriptions with type info
create or replace function public.get_all_active_subscriptions()
returns table(email text, subscription_type varchar(50))
language sql
stable
as $$
  select email, subscription_type from public.email_subscription
  where is_active = true
  and email is not null;
$$;
