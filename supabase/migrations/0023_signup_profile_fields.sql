-- XFunction: optional grade level + platform preference, captured at signup
-- Run this once in the Supabase dashboard's SQL Editor, after 0022_manual_courses.sql.
--
-- Both fields are nullable with no default — the signup form (see
-- app/login/page.tsx) never requires them, so a student who skips both
-- just gets null here, same as an account created before this migration
-- existed. platform_preference isn't used to gate or auto-connect
-- anything; it only pre-selects a matching option in the "Connect your
-- platform" section (see app/(dashboard)/courses/page.tsx and
-- components/PlatformConnectionsCard.tsx) so that section feels
-- tailored instead of starting from a generic default.
alter table profiles add column if not exists grade_level text
  check (grade_level in ('9', '10', '11', '12'));

alter table profiles add column if not exists platform_preference text
  check (platform_preference in ('canvas', 'google-classroom', 'schoology', 'powerschool', 'other', 'not-sure'));

-- Extended (not replaced) from 0017_onboarding_emails.sql: the trigger
-- already stamps created_at at auth.users insert time, before any app
-- code runs — the same moment is the only reliable place to persist
-- signup-time answers, since a student whose account requires email
-- confirmation has no session yet to write profiles with once
-- supabase.auth.signUp() returns. options.data passed to signUp() lands
-- in auth.users.raw_user_meta_data immediately, which this trigger can
-- already see.
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
    nullif(new.raw_user_meta_data ->> 'grade_level', ''),
    nullif(new.raw_user_meta_data ->> 'platform_preference', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
