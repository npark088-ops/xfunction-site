-- xFunction: Stripe webhook support functions
-- Run this once in the Supabase dashboard's SQL Editor, after 0002_profiles.sql.
--
-- The Stripe webhook (app/api/stripe/webhook) has no signed-in user
-- session — Stripe calls our server directly — so the normal RLS rule
-- "auth.uid() = user_id" can't apply. Rather than hand the app a full
-- service-role key (which bypasses RLS on every table), these two
-- functions are SECURITY DEFINER and each do exactly one narrow thing.

create or replace function set_pro_on_checkout(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, is_pro, stripe_customer_id, stripe_subscription_id, updated_at)
  values (p_user_id, true, p_customer_id, p_subscription_id, now())
  on conflict (user_id) do update
    set is_pro = true,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        updated_at = now();
end;
$$;

create or replace function set_pro_on_cancellation(
  p_customer_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
    set is_pro = false, updated_at = now()
    where stripe_customer_id = p_customer_id;
end;
$$;

grant execute on function set_pro_on_checkout(uuid, text, text) to anon, authenticated;
grant execute on function set_pro_on_cancellation(text) to anon, authenticated;
