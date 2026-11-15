-- XFunction: stop signed-in users from writing their own profiles row, and
-- close profiles to the anonymous role entirely.
--
-- *** HOLD — DO NOT RUN YET. ***
-- The server-side code this depends on is now WRITTEN (lib/profile-server.ts:
-- every profiles write moved to the server, verified against the user's
-- session, performed with the service-role admin client). But running this
-- file BEFORE that code is live in production would make quota counting,
-- streaks and the "first study plan" achievement silently stop working for
-- everyone, because the OLD code writes profiles with the user's own session.
--
-- SAFE TO RUN WHEN ALL FIVE OF THESE ARE TRUE (in this order):
--   1. supabase/pending/0026_consume_usage.sql has been run in the SQL Editor
--      (the new code calls consume_usage; without it AI features return errors).
--   2. SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET are set in Vercel for
--      Production (and Preview, if you use previews). Never NEXT_PUBLIC_.
--   3. The commit "Move profile writes server-side ..." is DEPLOYED to
--      production (not just merged to a branch).
--   4. You have verified it live while signed in as a normal test account:
--        - generate a study plan -> Settings usage goes up by 1 (not 2);
--        - open /app twice in one day -> streak does not double-count;
--        - after the first study plan, the "first study plan" achievement shows;
--        - Vercel function logs show no "consume_usage failed" errors.
--   5. You are not mid-incident (if the lockdown breaks something, the
--      ROLLBACK at the bottom restores the old behavior in seconds).
-- Running it before step 3 breaks the app for everyone. Running it after
-- step 4 is the whole point.
--
-- THE HOLE (supabase/migrations/0002_profiles.sql):
--   create policy "Users manage their own profile" on profiles
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- RLS decides WHICH ROWS a user may touch, not which columns. So any
-- signed-in user can send, with their own session token:
--   PATCH /rest/v1/profiles?user_id=eq.<their id>   {"is_pro": true}
-- and get free Pro — and likewise rewrite stripe_customer_id,
-- stripe_subscription_id, every *_used counter and *_period_start (free
-- unlimited AI), the streak columns and first_study_plan_at. They can
-- even DELETE their own row, which resets all counters to zero.
--
-- THE FIX: profiles becomes read-only for signed-in users and invisible to
-- anon. Reads stay (the app shows plan, usage and streak from the user's own
-- row). Everything that writes goes through code that already runs as the
-- service role, which bypasses RLS and keeps its grants:
--   * lib/profile-server.ts   quota counters, streak, first_study_plan_at
--   * set_pro_on_checkout / set_pro_on_cancellation  (Stripe webhook; SECURITY DEFINER)
--   * handle_new_user trigger, delete_own_account cascade  (SECURITY DEFINER / FK
--     cascade — they run as the table owner, so these revokes don't affect them)
--
-- Re-run safe: drop-if-exists/create, revoke/grant are idempotent. One
-- transaction: all of it applies, or none of it.

begin;

-- 1) Replace the broad "for all" policy with read-only access to OWN row.
drop policy if exists "Users manage their own profile" on profiles;
drop policy if exists "Users can read their own profile" on profiles;
alter table profiles enable row level security;
create policy "Users can read their own profile"
  on profiles
  for select
  using (auth.uid() = user_id);

-- 2) Privileges. Policies alone don't stop a role that still holds the
--    privilege and has some policy that matches, so remove the privileges too:
--    no one but service_role can write, and anon (logged-out visitors) gets
--    nothing at all. `revoke all` also clears insert/update/delete/truncate/
--    references/trigger and any column-level grants.
revoke all on table profiles from public, anon, authenticated;
grant select on table profiles to authenticated;
-- service_role keeps full access (it bypasses RLS and keeps its grants).

commit;


-- ============================================================
-- AFTER RUNNING — read-only checks (run each separately):
-- ============================================================
-- a) Expected: authenticated has ONLY SELECT; anon appears nowhere.
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'profiles'
--     and grantee in ('anon', 'authenticated', 'public')
--   order by 1, 2;
--
-- b) Expected: exactly one policy — "Users can read their own profile", cmd = SELECT.
--   select policyname, cmd, roles from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';
--
-- c) Prove a user can no longer self-upgrade (rolled back, changes nothing):
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
--   update profiles set is_pro = true where user_id = '00000000-0000-0000-0000-000000000000';
--   -- EXPECTED: ERROR: permission denied for table profiles
--   rollback;
--
-- d) From outside (no SQL): a request to /rest/v1/profiles with ONLY the anon
--    key should now return HTTP 401 / code 42501 "permission denied for table
--    profiles" (before the lockdown it returns 200 with an empty list).
--
-- e) In the app, signed in as a normal user: Settings still shows plan and
--    usage; generating a study plan still works and counts exactly once.


-- ============================================================
-- ROLLBACK (restores the old, unsafe behavior — only if the lockdown
-- breaks something and you need time to fix the code):
-- ============================================================
--   begin;
--   drop policy if exists "Users can read their own profile" on profiles;
--   create policy "Users manage their own profile" on profiles
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   grant select, insert, update, delete on table profiles to authenticated;
--   grant select, insert, update, delete on table profiles to anon;  -- only if anon had them before
--   commit;
