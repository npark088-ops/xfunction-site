-- XFunction: atomic free-tier quota check + count, for the AI generators,
-- Your Consultant chat and Support chat. NOT applied by the code until you
-- run it; the matching code is lib/profile-server.ts (consumeUsage).
--
-- WHY: the old code (lib/ai-usage.ts) read the counter, compared it, then
-- wrote counter + 1 as separate calls, using the signed-in user's own
-- session. Two things were wrong with that:
--   * it could be raced — two requests at once both read "2 used", both
--     pass the limit of 3, and both generate;
--   * it only worked because users could write their own profiles row, which
--     also let them set is_pro or reset the counters themselves.
-- This function does the check and the increment in ONE transaction, holding
-- a row lock on the user's profile, so concurrent calls queue up and each
-- sees the previous one's count. It is callable ONLY by service_role (the
-- server's admin client, after it has verified the user's session).
--
-- Behaviour (identical to the old code, just atomic):
--   * the row is created if the account has none yet;
--   * if the stored period is not the current one, the count restarts at 0;
--   * Pro accounts always pass and are not counted;
--   * otherwise, if used >= limit -> refused (nothing is changed);
--     else used + 1 is stored and the call is allowed.
--
-- Re-run safe: create or replace + idempotent revoke/grant.
-- Apply BEFORE deploying the new code (the new code calls this function).

create or replace function consume_usage(
  p_user_id uuid,
  p_kind text,      -- 'ai' | 'chat' | 'support'
  p_limit integer,  -- free allowance per month for that kind
  p_period date     -- first day of the current UTC month (the app passes it)
)
returns table (r_allowed boolean, r_used integer, r_is_pro boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pro boolean;
  v_used integer;
begin
  if p_kind not in ('ai', 'chat', 'support') then
    raise exception 'consume_usage: unknown kind %', p_kind using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'consume_usage: limit must be at least 1' using errcode = '22023';
  end if;

  -- Accounts older than the signup trigger may not have a row yet.
  insert into profiles (user_id) values (p_user_id) on conflict (user_id) do nothing;

  -- FOR UPDATE: concurrent calls for this user wait here until we commit.
  if p_kind = 'ai' then
    select p.is_pro,
           case when p.usage_period_start = p_period then p.ai_generations_used else 0 end
      into v_pro, v_used
      from profiles p where p.user_id = p_user_id for update;
  elsif p_kind = 'chat' then
    select p.is_pro,
           case when p.chat_usage_period_start = p_period then p.chat_messages_used else 0 end
      into v_pro, v_used
      from profiles p where p.user_id = p_user_id for update;
  else
    select p.is_pro,
           case when p.support_usage_period_start = p_period then p.support_messages_used else 0 end
      into v_pro, v_used
      from profiles p where p.user_id = p_user_id for update;
  end if;

  if v_pro then
    return query select true, v_used, true;
    return;
  end if;

  if v_used >= p_limit then
    return query select false, v_used, false;
    return;
  end if;

  v_used := v_used + 1;

  if p_kind = 'ai' then
    update profiles
       set ai_generations_used = v_used, usage_period_start = p_period, updated_at = now()
     where user_id = p_user_id;
  elsif p_kind = 'chat' then
    update profiles
       set chat_messages_used = v_used, chat_usage_period_start = p_period, updated_at = now()
     where user_id = p_user_id;
  else
    update profiles
       set support_messages_used = v_used, support_usage_period_start = p_period, updated_at = now()
     where user_id = p_user_id;
  end if;

  return query select true, v_used, false;
end;
$$;

-- service_role ONLY ("public" must be revoked too: Postgres grants EXECUTE to
-- PUBLIC by default, and Supabase also grants anon/authenticated).
revoke all on function consume_usage(uuid, text, integer, date) from public, anon, authenticated;
grant execute on function consume_usage(uuid, text, integer, date) to service_role;

-- ------------------------------------------------------------
-- AFTER RUNNING — read-only checks:
--   -- must be: anon_can_run = false, authed_can_run = false
--   select has_function_privilege('anon', p.oid, 'execute')          as anon_can_run,
--          has_function_privilege('authenticated', p.oid, 'execute') as authed_can_run
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace and p.proname = 'consume_usage';
--
-- ROLLBACK (the new code needs this function, so only after rolling the code
-- back too):  drop function consume_usage(uuid, text, integer, date);
-- ------------------------------------------------------------
