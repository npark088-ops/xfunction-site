-- XFunction: pending schema + security changes, in dependency order.
-- Paste this WHOLE file into the Supabase dashboard SQL Editor and run it
-- once. It is safe to re-run (see the notes on each part). It equals, in
-- order: migration 0017 (service_role-only grants) -> 0018 -> the
-- delete_own_account / accept_parent_invite revokes (from 0024) -> the
-- final handle_new_user() that saves signup fields (from 0023).
--
-- NOT changed here, on purpose: set_pro_on_checkout /
-- set_pro_on_cancellation (already locked down in your database —
-- verified with the anon key: 401 permission denied).
-- peek_parent_invite IS locked down here (signed-in users only): its only
-- caller, /parent/join, is behind login.
--
-- You can delete this file after running it; the real migrations live in
-- supabase/migrations/.


-- ============================================================
-- PART 1 — 0017: onboarding emails
-- Re-run safe: add column if not exists / create or replace /
-- drop trigger if exists / create table if not exists / revoke+grant.
-- ============================================================

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

create table if not exists onboarding_emails (
  user_id uuid not null references auth.users(id) on delete cascade,
  email_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, email_key)
);

alter table onboarding_emails enable row level security;
-- Deliberately no end-user policy: only the service-role server routes touch this.

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

-- service_role ONLY. get_onboarding_email_candidates returns user emails.
-- "public" must be revoked too: Postgres grants EXECUTE to PUBLIC by default.
revoke all on function get_onboarding_email_candidates(text, numeric) from public, anon, authenticated;
grant execute on function get_onboarding_email_candidates(text, numeric) to service_role;

revoke all on function mark_onboarding_email_sent(uuid, text) from public, anon, authenticated;
grant execute on function mark_onboarding_email_sent(uuid, text) to service_role;


-- ============================================================
-- PART 2 — 0018: study sessions
-- Re-run safe: create table/index if not exists; the policy is
-- dropped first because CREATE POLICY has no IF NOT EXISTS.
-- ============================================================

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  duration_minutes int not null check (duration_minutes > 0),
  occurred_at timestamptz not null default now()
);

alter table study_sessions enable row level security;

drop policy if exists "Users manage their own study sessions" on study_sessions;
create policy "Users manage their own study sessions"
  on study_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_sessions_user_occurred_idx
  on study_sessions (user_id, occurred_at desc);


-- ============================================================
-- PART 3 — signed-in users only for these three functions
-- (Postgres grants EXECUTE to PUBLIC by default, so anon could call them.)
-- Re-run safe: revoke/grant are idempotent. delete_own_account and
-- accept_parent_invite are verified to exist in your database;
-- peek_parent_invite is created by the same migration (0012) as
-- accept_parent_invite, so it exists too.
-- ============================================================

revoke all on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;

revoke all on function accept_parent_invite(text) from public, anon;
grant execute on function accept_parent_invite(text) to authenticated;

revoke all on function peek_parent_invite(text) from public, anon;
grant execute on function peek_parent_invite(text) to authenticated;


-- ============================================================
-- PART 4 — final handle_new_user(): saves grade_level / platform_preference
-- Must come AFTER Part 1 (Part 1 re-creates this function without them).
-- Re-run safe: create or replace. Only the exact allowed values are kept;
-- anything else becomes null, so a bad signup value can't abort the signup.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (user_id, created_at, grade_level, platform_preference)
  values (
    new.id,
    now(),
    case when new.raw_user_meta_data ->> 'grade_level' in ('9', '10', '11', '12')
         then new.raw_user_meta_data ->> 'grade_level' end,
    case when new.raw_user_meta_data ->> 'platform_preference'
              in ('canvas', 'google-classroom', 'schoology', 'powerschool', 'other', 'not-sure')
         then new.raw_user_meta_data ->> 'platform_preference' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;


-- ============================================================
-- OPTIONAL — NOT run unless you remove the leading "-- " from each line.
-- Stops the onboarding cron from emailing every EXISTING account.
-- Why it matters: Part 1 adds profiles.created_at with default now(), and
-- onboarding_emails starts empty, so the next cron run would treat every
-- existing user as brand new (the "welcome" step has no minimum age).
-- This marks all four steps as already sent for accounts that exist today.
-- Re-run safe (on conflict do nothing). Step keys come from
-- lib/onboarding-emails.ts.
-- ============================================================

-- insert into onboarding_emails (user_id, email_key)
-- select p.user_id, k.email_key
-- from profiles p
-- cross join (values ('welcome'), ('connect_canvas'), ('try_ai_study_plan'), ('week_wrapup')) as k(email_key)
-- on conflict (user_id, email_key) do nothing;
