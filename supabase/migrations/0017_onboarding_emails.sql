-- XFunction: onboarding email sequence
-- Run this once in the Supabase dashboard's SQL Editor, after 0016_chat_usage.sql.

-- profiles previously had no signup timestamp — study plan generation,
-- Canvas connect, etc. each separately upsert a profiles row on first
-- use, which left accounts with no row (and so nothing to measure "day
-- since signup" from) until one of those happened to fire. The trigger
-- below stamps created_at the moment an account exists, independent of
-- whatever app code path runs next.
alter table profiles add column if not exists created_at timestamptz not null default now();

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, created_at) values (new.id, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Records which onboarding step emails a user has already received, so
-- the daily cron (see app/api/cron/onboarding-emails) never re-sends
-- one — same idempotent-upsert shape as the notifications dedupe in
-- 0007_notifications.sql, just keyed by email_key instead.
create table if not exists onboarding_emails (
  user_id uuid not null references auth.users(id) on delete cascade,
  email_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, email_key)
);

alter table onboarding_emails enable row level security;
-- Deliberately no end-user policy: this table is only ever written by
-- mark_onboarding_email_sent() below, called from the unauthenticated
-- cron route — there's no signed-in session to key a normal
-- "auth.uid() = user_id" policy off, same reasoning as
-- 0003_stripe_webhook.sql.

-- Returns the users eligible for a given onboarding step: old enough
-- (p_min_age_hours), and haven't already received this email_key.
-- canvas_connected / has_study_plan let the cron route skip a step
-- entirely for a user who's already taken that action. SECURITY
-- DEFINER because the cron route has no signed-in session — same
-- pattern as set_pro_on_checkout in 0003_stripe_webhook.sql.
create or replace function get_onboarding_email_candidates(
  p_email_key text,
  p_min_age_hours numeric
) returns table (
  user_id uuid,
  email text,
  canvas_connected boolean,
  has_study_plan boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.user_id,
    u.email,
    exists(select 1 from canvas_connections c where c.user_id = p.user_id) as canvas_connected,
    (p.first_study_plan_at is not null) as has_study_plan
  from profiles p
  join auth.users u on u.id = p.user_id
  where p.created_at <= now() - (p_min_age_hours || ' hours')::interval
    and u.email is not null
    and not exists (
      select 1 from onboarding_emails oe
      where oe.user_id = p.user_id and oe.email_key = p_email_key
    );
end;
$$;

create or replace function mark_onboarding_email_sent(
  p_user_id uuid,
  p_email_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into onboarding_emails (user_id, email_key, sent_at)
  values (p_user_id, p_email_key, now())
  on conflict (user_id, email_key) do nothing;
end;
$$;

grant execute on function get_onboarding_email_candidates(text, numeric) to anon, authenticated;
grant execute on function mark_onboarding_email_sent(uuid, text) to anon, authenticated;
