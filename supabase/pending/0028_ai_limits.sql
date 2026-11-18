-- XFunction: adjustable AI limits with a DAILY cap for Pro (instead of "unlimited")
-- NOT RUN YET. Paste into the Supabase dashboard's SQL Editor when ready.
--
-- WHY A NEW FILE: the existing consume_usage() (0026_consume_usage.sql) cannot
-- do this:
--   * Pro accounts always pass and are never counted (an early "return true"),
--     so there is no way to give Pro a daily cap with it;
--   * it takes ONE limit and ONE period (the first of the UTC month), but Pro
--     needs its own limit and its own period (the student's local date);
--   * it only knows the kinds 'ai', 'chat' and 'support', and there are no
--     counter columns for 'import'.
-- What it CAN already do, and this file reuses: 'chat' is "ask" (Your
-- Consultant), so no new kind is needed for ask, only a different number; and
-- the period is just a date compared for equality, so a daily date works in the
-- same columns.
--
-- WHAT THIS ADDS
--   1. Two counter columns on profiles for the new "import" kind.
--   2. consume_usage_v2(): one atomic check-and-count (row lock, like v1) that
--      picks the Free or Pro limit and period itself, because only the database
--      knows whether the account is Pro at that exact moment.
--
-- PERIOD RULES (inside the function)
--   Free: the app passes the first day of the UTC month. A new month restarts
--         the count at 0 (same as v1). The key is chosen by the server, never
--         by the browser, so it cannot be gamed.
--   Pro:  the app passes the student's LOCAL date (from their time zone), so the
--         daily limit resets at their midnight. That date comes from the
--         browser, so the function never lets it go BACKWARDS: it counts under
--         the later of the stored date and the one sent. Without this, a script
--         could alternate two time zones to reset the counter on every call.
--         It also refuses any date more than 2 days from the database's today
--         (a real time zone is never more than 1 day off).
--   Switching plans (free -> Pro or Pro -> free) changes the period key, which
--   restarts the count; nothing else is carried over.
--
-- LOCKED DOWN FROM THE START
--   * The function is SECURITY DEFINER with a fixed search_path, and
--     "revoke all ... from public, anon, authenticated" then "grant execute ... to
--     service_role" only. Postgres grants EXECUTE to PUBLIC by default, so the
--     revoke is not optional. Only the server's admin client can call it, after
--     it has verified the signed-in user from their session.
--   * profiles already has RLS on and is read-only for signed-in users (see
--     HOLD-profiles-lockdown-*.sql); the two new columns inherit that, so a
--     signed-in user can read them but never write them.
--
-- ORDER: the new code (branch ai-limits) works either way. If this file has not
-- been run yet it falls back to the old consume_usage(), which keeps today's
-- behaviour (free limits only, Pro uncapped, no import quota) until you run it.
-- Run this BEFORE or right after deploying; both orders are safe.
--
-- Re-run safe: add column if not exists, create or replace, idempotent grants.

alter table profiles
  add column if not exists import_used int not null default 0,
  add column if not exists import_usage_period_start date not null default date_trunc('month', now())::date;

create or replace function consume_usage_v2(
  p_user_id uuid,
  p_kind text,            -- 'ai' (shared tools) | 'chat' (ask) | 'support' | 'import'
  p_free_limit integer,   -- Free allowance per period
  p_free_period date,     -- Free period key: first day of the current UTC month
  p_pro_limit integer,    -- Pro allowance per period
  p_pro_period date       -- Pro period key: the student's local date
)
returns table (r_allowed boolean, r_used integer, r_limit integer, r_is_pro boolean, r_period date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro boolean;
  v_stored_period date;
  v_stored_used integer;
  v_period date;
  v_limit integer;
  v_used integer;
begin
  if p_kind not in ('ai', 'chat', 'support', 'import') then
    raise exception 'consume_usage_v2: unknown kind %', p_kind using errcode = '22023';
  end if;
  if p_free_limit is null or p_free_limit < 1 or p_pro_limit is null or p_pro_limit < 1 then
    raise exception 'consume_usage_v2: limits must be at least 1' using errcode = '22023';
  end if;
  if p_pro_period < current_date - 2 or p_pro_period > current_date + 2 then
    raise exception 'consume_usage_v2: pro period is not a plausible date' using errcode = '22023';
  end if;

  -- Accounts older than the signup trigger may not have a row yet.
  insert into profiles (user_id) values (p_user_id) on conflict (user_id) do nothing;

  -- FOR UPDATE: concurrent calls for this user wait here until we commit.
  if p_kind = 'ai' then
    select p.is_pro, p.usage_period_start, p.ai_generations_used
      into v_pro, v_stored_period, v_stored_used
      from profiles p where p.user_id = p_user_id for update;
  elsif p_kind = 'chat' then
    select p.is_pro, p.chat_usage_period_start, p.chat_messages_used
      into v_pro, v_stored_period, v_stored_used
      from profiles p where p.user_id = p_user_id for update;
  elsif p_kind = 'support' then
    select p.is_pro, p.support_usage_period_start, p.support_messages_used
      into v_pro, v_stored_period, v_stored_used
      from profiles p where p.user_id = p_user_id for update;
  else
    select p.is_pro, p.import_usage_period_start, p.import_used
      into v_pro, v_stored_period, v_stored_used
      from profiles p where p.user_id = p_user_id for update;
  end if;

  if v_pro then
    v_limit := p_pro_limit;
    v_period := greatest(v_stored_period, p_pro_period);  -- never backwards
  else
    v_limit := p_free_limit;
    v_period := p_free_period;
  end if;

  -- A different period than the one stored means the count starts over.
  v_used := case when v_stored_period = v_period then v_stored_used else 0 end;

  if v_used >= v_limit then
    return query select false, v_used, v_limit, v_pro, v_period;  -- nothing is changed
    return;
  end if;

  v_used := v_used + 1;

  if p_kind = 'ai' then
    update profiles set ai_generations_used = v_used, usage_period_start = v_period, updated_at = now()
     where user_id = p_user_id;
  elsif p_kind = 'chat' then
    update profiles set chat_messages_used = v_used, chat_usage_period_start = v_period, updated_at = now()
     where user_id = p_user_id;
  elsif p_kind = 'support' then
    update profiles set support_messages_used = v_used, support_usage_period_start = v_period, updated_at = now()
     where user_id = p_user_id;
  else
    update profiles set import_used = v_used, import_usage_period_start = v_period, updated_at = now()
     where user_id = p_user_id;
  end if;

  return query select true, v_used, v_limit, v_pro, v_period;
end;
$$;

-- service_role ONLY. "public" must be revoked too: Postgres grants EXECUTE to
-- PUBLIC by default, and Supabase also grants anon/authenticated.
revoke all on function consume_usage_v2(uuid, text, integer, date, integer, date) from public, anon, authenticated;
grant execute on function consume_usage_v2(uuid, text, integer, date, integer, date) to service_role;

-- ------------------------------------------------------------
-- AFTER RUNNING: read-only checks
--   -- both must be false:
--   select has_function_privilege('anon', p.oid, 'execute')          as anon_can_run,
--          has_function_privilege('authenticated', p.oid, 'execute') as authed_can_run
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace and p.proname = 'consume_usage_v2';
--
--   -- the two new columns exist and a signed-in user can't write them (no
--   -- update privilege): expect no 'UPDATE' row for authenticated/anon.
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_name = 'profiles' and grantee in ('anon', 'authenticated', 'public');
--
-- ROLLBACK (only after rolling the code back, or it falls back to v1 anyway):
--   drop function consume_usage_v2(uuid, text, integer, date, integer, date);
--   alter table profiles drop column import_used, drop column import_usage_period_start;
-- The old consume_usage() is left in place on purpose (the code falls back to
-- it); drop it later, once v2 is confirmed live, if you want it gone.
-- ------------------------------------------------------------
