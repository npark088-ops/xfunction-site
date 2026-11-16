-- XFunction: lock down EXECUTE on SECURITY DEFINER functions.
-- Run this once in the Supabase dashboard's SQL Editor, AFTER the app
-- code that uses lib/supabase/admin.ts is deployed and
-- SUPABASE_SERVICE_ROLE_KEY is set (see below), and after 0017/0018.
--
-- Why: Postgres grants EXECUTE on new functions to PUBLIC by default,
-- and Supabase also grants it to anon/authenticated/service_role. The
-- original migrations only granted narrower roles but never revoked the
-- defaults, so anyone holding the public anon key (it ships in the
-- browser bundle) could call these over REST:
--   - set_pro_on_checkout / set_pro_on_cancellation  -> grant or revoke
--     Pro for any user id / Stripe customer id
--   - get_onboarding_email_candidates -> returns user email addresses
--   - mark_onboarding_email_sent -> writes rows for any user id
-- The first four are now service_role ONLY (called from the Stripe
-- webhook and onboarding routes via the server-only admin client).
-- delete_own_account, accept_parent_invite and peek_parent_invite stay
-- available to signed-in users but not anonymous callers (the only
-- caller of the last two is /parent/join, which is behind login).
--
-- This file is for a database where 0003/0008/0012/0017 were ALREADY run
-- with their old grants. Each statement is wrapped so a function that
-- doesn't exist yet is skipped instead of failing the whole script, and
-- the whole file is safe to re-run. (A fresh setup doesn't need this
-- file: 0003, 0008, 0012 and 0017 now contain the same revoke/grant.)

do $$
begin
  if to_regprocedure('public.set_pro_on_checkout(uuid, text, text)') is not null then
    revoke all on function public.set_pro_on_checkout(uuid, text, text) from public, anon, authenticated;
    grant execute on function public.set_pro_on_checkout(uuid, text, text) to service_role;
  end if;

  if to_regprocedure('public.set_pro_on_cancellation(text)') is not null then
    revoke all on function public.set_pro_on_cancellation(text) from public, anon, authenticated;
    grant execute on function public.set_pro_on_cancellation(text) to service_role;
  end if;

  if to_regprocedure('public.get_onboarding_email_candidates(text, numeric)') is not null then
    revoke all on function public.get_onboarding_email_candidates(text, numeric) from public, anon, authenticated;
    grant execute on function public.get_onboarding_email_candidates(text, numeric) to service_role;
  end if;

  if to_regprocedure('public.mark_onboarding_email_sent(uuid, text)') is not null then
    revoke all on function public.mark_onboarding_email_sent(uuid, text) from public, anon, authenticated;
    grant execute on function public.mark_onboarding_email_sent(uuid, text) to service_role;
  end if;

  if to_regprocedure('public.delete_own_account()') is not null then
    revoke all on function public.delete_own_account() from public, anon;
    grant execute on function public.delete_own_account() to authenticated;
  end if;

  if to_regprocedure('public.accept_parent_invite(text)') is not null then
    revoke all on function public.accept_parent_invite(text) from public, anon;
    grant execute on function public.accept_parent_invite(text) to authenticated;
  end if;

  if to_regprocedure('public.peek_parent_invite(text)') is not null then
    revoke all on function public.peek_parent_invite(text) from public, anon;
    grant execute on function public.peek_parent_invite(text) to authenticated;
  end if;
end
$$;
