-- XFunction: stop signed-in users from writing their own profiles row.
--
-- *** HOLD — DO NOT RUN until the code that moves every profiles write to
-- *** the server-only admin client is written, deployed, and verified in
-- *** production (see the deploy order in the PR/summary). Running this
-- *** first would make quota counting, streaks, and the "first study plan"
-- *** achievement silently stop working for everyone.
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
-- THE FIX: profiles becomes read-only for end users. Every write already
-- happens in a server route, so after the code change they all go through
-- the service-role client (lib/supabase/admin.ts), which bypasses RLS and
-- grants. SECURITY DEFINER functions (handle_new_user trigger,
-- set_pro_on_checkout/cancellation, delete_own_account's cascade) are
-- unaffected: they run as the table owner.
--
-- Re-run safe: drop-if-exists/create, revoke/grant are idempotent.

-- 1) Replace the broad "for all" policy with read-only access to own row.
drop policy if exists "Users manage their own profile" on profiles;
drop policy if exists "Users can read their own profile" on profiles;
create policy "Users can read their own profile"
  on profiles
  for select
  using (auth.uid() = user_id);

-- 2) Privileges (policies alone don't stop a role that still holds the
--    privilege and has some policy that matches).
revoke all on table profiles from anon;
revoke insert, update, delete, truncate on table profiles from authenticated;
grant select on table profiles to authenticated;
-- service_role keeps full access (it bypasses RLS and keeps its grants).


-- ============================================================
-- AFTER RUNNING — read-only checks (run each separately):
-- ============================================================
-- Expected: authenticated has ONLY select; anon has nothing.
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'profiles'
--     and grantee in ('anon', 'authenticated')
--   order by 1, 2;
--
-- Prove a user can no longer self-upgrade (rolled back, changes nothing):
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
--   update profiles set is_pro = true where user_id = '00000000-0000-0000-0000-000000000000';
--   -- EXPECTED: ERROR: permission denied for table profiles
--   rollback;


-- ============================================================
-- ROLLBACK (restores the old, unsafe behavior — only if the lockdown
-- breaks something and you need time to fix the code):
-- ============================================================
--   drop policy if exists "Users can read their own profile" on profiles;
--   create policy "Users manage their own profile" on profiles
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   grant insert, update, delete on table profiles to authenticated;
