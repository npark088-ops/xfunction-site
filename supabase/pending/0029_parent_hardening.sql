-- XFunction: make the parent link feature safe before real parents use it.
-- NOT RUN YET. Review, then paste into the Supabase dashboard's SQL Editor.
-- Runs as ONE transaction: all of it applies, or none of it.
--
-- WHAT WAS WRONG (see the audit): invite codes were made in the student's
-- browser (about 40 bits), stored in plain text, never expired and could be
-- guessed without limit; the student could edit their own link rows freely;
-- and a linked parent's login could read the student's raw courses, categories
-- and every individual score straight from the database.
--
-- WHAT THIS CHANGES
--   1. Invite codes: the server makes the code (192 bits of randomness), the
--      database stores ONLY its SHA-256 hash, the student sees the code once,
--      a pending invite expires after 7 days, and a code works once (the hash
--      is erased when it is claimed or revoked).
--   2. Guess throttling: a signed-in user gets 5 wrong codes per hour; after
--      that every attempt is refused (even a correct code) until the hour is up.
--      Fails closed: if the check can't run, nothing is claimed.
--   3. No direct writes: signed-in users can no longer insert, update or delete
--      parent_links rows. Students read their own links; creating, revoking and
--      leaving happen only through the functions below.
--   4. Parents can no longer read courses, assignment_groups or assignments at
--      all. The /parent page asks the server, which checks the active link from
--      the session and returns a small summary (grades and what's due only).
--
-- OLD DATA
--   * Links that are already ACTIVE keep working (status and parent_id are not
--     touched).
--   * Old PENDING invites are revoked (there are no real users yet, and their
--     codes were stored in plain text). Every stored plain-text code is erased.
--
-- DEPLOY ORDER: run this and deploy the matching code (branch parent-hardening)
-- close together. The old code calls functions this file removes, and the new
-- code calls functions this file adds, so the parent feature is unavailable for
-- the minutes between the two (nothing else is affected).
--
-- LOCKED DOWN FROM THE START
--   * parent_links: RLS on; "revoke all" from public/anon/authenticated, then
--     only column-level SELECT for authenticated (never the hash), and two
--     read-only policies. No insert/update/delete privilege or policy exists.
--   * parent_invite_attempts: RLS on, no policies, no grants to anyone but the
--     table owner (only the SECURITY DEFINER functions touch it).
--   * Every function is SECURITY DEFINER with a fixed search_path, has EXECUTE
--     revoked from public/anon/authenticated, and is then granted ONLY to the
--     role that needs it:
--       create_parent_invite, claim_parent_invite, peek_parent_invite_v2
--           -> service_role only (the server calls them after verifying the
--              user's session; the browser cannot)
--       revoke_parent_link, leave_parent_link
--           -> authenticated (they act only on the caller's own rows, via auth.uid())
--
-- Re-run safe: add column if not exists / create or replace / drop if exists.

begin;

-- ---------------------------------------------------------------- 1. columns
alter table parent_links
  add column if not exists invite_code_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists ended_by text;

alter table parent_links drop constraint if exists parent_links_ended_by_check;
alter table parent_links
  add constraint parent_links_ended_by_check check (ended_by is null or ended_by in ('student', 'parent', 'system'));

-- Plain-text codes are no longer stored at all.
alter table parent_links alter column invite_code drop not null;

-- Old pending invites: revoked (nobody can claim a plain-text code any more).
update parent_links
   set status = 'revoked', revoked_at = now(), ended_by = 'system'
 where status = 'pending';
-- Erase every plain-text code, active links included.
update parent_links set invite_code = null where invite_code is not null;

create unique index if not exists parent_links_invite_code_hash_key
  on parent_links (invite_code_hash) where invite_code_hash is not null;

-- A pending invite must have a hash and an expiry (no pending rows without one exist now).
alter table parent_links drop constraint if exists parent_links_pending_check;
alter table parent_links
  add constraint parent_links_pending_check
  check (status <> 'pending' or (invite_code_hash is not null and expires_at is not null));

-- ------------------------------------------------- 2. failed-attempt bookkeeping
create table if not exists parent_invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists parent_invite_attempts_user_time
  on parent_invite_attempts (user_id, attempted_at desc);

alter table parent_invite_attempts enable row level security;
revoke all on table parent_invite_attempts from public, anon, authenticated;
-- No policies and no grants: only the SECURITY DEFINER functions below (which
-- run as the table owner) can touch it.

-- ------------------------------------- 3. parent_links: read-only for users
drop policy if exists "Students manage their own parent links" on parent_links;
drop policy if exists "Parents can view links where they are the parent" on parent_links;
drop policy if exists "Students read their own parent links" on parent_links;
drop policy if exists "Parents read their own active links" on parent_links;

alter table parent_links enable row level security;

create policy "Students read their own parent links"
  on parent_links
  for select
  to authenticated
  using (auth.uid() = student_id);

create policy "Parents read their own active links"
  on parent_links
  for select
  to authenticated
  using (auth.uid() = parent_id and status = 'active');

-- Privileges: nothing for anon/public; signed-in users get SELECT on a fixed
-- list of columns (invite_code and invite_code_hash are NOT on it) and no
-- insert/update/delete of any kind.
revoke all on table parent_links from public, anon, authenticated;
grant select (id, student_id, student_email, parent_id, parent_email, status,
              created_at, expires_at, accepted_at, revoked_at, ended_by)
  on table parent_links to authenticated;

-- ------------------------- 4. parents can no longer read raw student data
drop policy if exists "Parents can view their linked student's courses" on courses;
drop policy if exists "Parents can view their linked student's assignment groups" on assignment_groups;
drop policy if exists "Parents can view their linked student's assignments" on assignments;

-- --------------------------------------------------------------- 5. functions
-- The old functions took the plain-text code; they are removed.
drop function if exists accept_parent_invite(text);
drop function if exists peek_parent_invite(text);

-- Student creates an invite. Called by the server (service_role) with the
-- student's id taken from the verified session and the SHA-256 hash of a code
-- the server generated. Returns the new invite's id and expiry.
create or replace function create_parent_invite(p_student_id uuid, p_code_hash text)
returns table (r_id uuid, r_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_pending integer;
  v_active integer;
  v_id uuid;
  v_expires timestamptz;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'create_parent_invite: not a SHA-256 hex hash' using errcode = '22023';
  end if;

  select u.email into v_email from auth.users u where u.id = p_student_id;
  if not found then
    raise exception 'create_parent_invite: unknown student' using errcode = '22023';
  end if;

  -- Expired invites stop counting (and can't be claimed anyway).
  update parent_links
     set status = 'revoked', revoked_at = now(), ended_by = 'system', invite_code_hash = null
   where student_id = p_student_id and status = 'pending' and expires_at <= now();

  select count(*) into v_pending from parent_links where student_id = p_student_id and status = 'pending';
  if v_pending >= 5 then
    raise exception 'too_many_pending_invites' using errcode = 'P0001';
  end if;
  select count(*) into v_active from parent_links where student_id = p_student_id and status = 'active';
  if v_active >= 10 then
    raise exception 'too_many_active_links' using errcode = 'P0001';
  end if;

  insert into parent_links (student_id, student_email, invite_code_hash, status, expires_at)
  values (p_student_id, v_email, p_code_hash, 'pending', now() + interval '7 days')
  returning id, expires_at into v_id, v_expires;

  return query select v_id, v_expires;
end;
$$;

-- Look at an invite before accepting it ("you're about to link to j***@gmail.com").
-- Wrong codes count against the same per-user allowance as claiming. The server
-- masks the email; the browser never sees the full address.
create or replace function peek_parent_invite_v2(
  p_parent_id uuid,
  p_code_hash text,
  p_max_failures integer default 5,
  p_window_minutes integer default 60
)
returns table (r_result text, r_student_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failures integer;
  v_row parent_links%rowtype;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'peek_parent_invite_v2: not a SHA-256 hex hash' using errcode = '22023';
  end if;
  if p_max_failures is null or p_max_failures < 1 or p_window_minutes is null or p_window_minutes < 1 then
    raise exception 'peek_parent_invite_v2: bad throttle settings' using errcode = '22023';
  end if;

  delete from parent_invite_attempts where attempted_at < now() - interval '1 day';
  -- One guess at a time per user, so the count below is exact.
  perform pg_advisory_xact_lock(hashtextextended('parent-invite:' || p_parent_id::text, 0));

  select count(*) into v_failures from parent_invite_attempts
   where user_id = p_parent_id and attempted_at > now() - make_interval(mins => p_window_minutes);
  if v_failures >= p_max_failures then
    return query select 'throttled'::text, null::text;
    return;
  end if;

  select * into v_row from parent_links
   where invite_code_hash = p_code_hash and status = 'pending' and parent_id is null and expires_at > now();
  if not found then
    insert into parent_invite_attempts (user_id) values (p_parent_id);
    return query select 'invalid'::text, null::text;
    return;
  end if;
  if v_row.student_id = p_parent_id then
    return query select 'own_invite'::text, null::text;
    return;
  end if;
  return query select 'ok'::text, v_row.student_email;
end;
$$;

-- Parent accepts an invite. Called by the server with the parent's id from the
-- verified session. One result word for every kind of failure that could leak
-- information ("invalid" covers wrong, expired, used and revoked codes alike).
create or replace function claim_parent_invite(
  p_parent_id uuid,
  p_code_hash text,
  p_max_failures integer default 5,
  p_window_minutes integer default 60
)
returns table (r_result text, r_student_id uuid, r_student_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failures integer;
  v_row parent_links%rowtype;
  v_parent_email text;
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'claim_parent_invite: not a SHA-256 hex hash' using errcode = '22023';
  end if;
  if p_max_failures is null or p_max_failures < 1 or p_window_minutes is null or p_window_minutes < 1 then
    raise exception 'claim_parent_invite: bad throttle settings' using errcode = '22023';
  end if;

  delete from parent_invite_attempts where attempted_at < now() - interval '1 day';
  perform pg_advisory_xact_lock(hashtextextended('parent-invite:' || p_parent_id::text, 0));

  select count(*) into v_failures from parent_invite_attempts
   where user_id = p_parent_id and attempted_at > now() - make_interval(mins => p_window_minutes);
  if v_failures >= p_max_failures then
    return query select 'throttled'::text, null::uuid, null::text;
    return;
  end if;

  -- FOR UPDATE: two parents racing for the same code can't both win.
  select * into v_row from parent_links
   where invite_code_hash = p_code_hash and status = 'pending' and parent_id is null and expires_at > now()
   for update;
  if not found then
    insert into parent_invite_attempts (user_id) values (p_parent_id);
    return query select 'invalid'::text, null::uuid, null::text;
    return;
  end if;

  if v_row.student_id = p_parent_id then
    return query select 'own_invite'::text, null::uuid, null::text;
    return;
  end if;

  select u.email into v_parent_email from auth.users u where u.id = p_parent_id;

  update parent_links
     set parent_id = p_parent_id,
         parent_email = v_parent_email,
         status = 'active',
         accepted_at = now(),
         invite_code_hash = null          -- a code works once
   where id = v_row.id;

  return query select 'ok'::text, v_row.student_id, v_row.student_email;
end;
$$;

-- Student revokes a pending invite or an active link. Acts only on the caller's
-- own rows. The parent loses access at once (their read policy needs 'active').
create or replace function revoke_parent_link(p_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'revoke_parent_link: not signed in' using errcode = '28000';
  end if;
  update parent_links
     set status = 'revoked', revoked_at = now(), ended_by = 'student', invite_code_hash = null
   where id = p_link_id and student_id = auth.uid() and status in ('pending', 'active');
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- Parent leaves a link. Acts only on links where the caller is the parent.
create or replace function leave_parent_link(p_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'leave_parent_link: not signed in' using errcode = '28000';
  end if;
  update parent_links
     set status = 'revoked', revoked_at = now(), ended_by = 'parent'
   where id = p_link_id and parent_id = auth.uid() and status = 'active';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- EXECUTE: "public" must be revoked too (Postgres grants it by default, and
-- Supabase also grants anon/authenticated), then each function goes only to the
-- role that needs it.
revoke all on function create_parent_invite(uuid, text) from public, anon, authenticated;
revoke all on function peek_parent_invite_v2(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function claim_parent_invite(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function revoke_parent_link(uuid) from public, anon, authenticated;
revoke all on function leave_parent_link(uuid) from public, anon, authenticated;

grant execute on function create_parent_invite(uuid, text) to service_role;
grant execute on function peek_parent_invite_v2(uuid, text, integer, integer) to service_role;
grant execute on function claim_parent_invite(uuid, text, integer, integer) to service_role;
grant execute on function revoke_parent_link(uuid) to authenticated;
grant execute on function leave_parent_link(uuid) to authenticated;

commit;

-- ------------------------------------------------------------------------
-- AFTER RUNNING: read-only checks
--
--   -- 1. Signed-in users have only SELECT on parent_links (no INSERT/UPDATE/DELETE):
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name = 'parent_links' and grantee in ('anon','authenticated','public')
--   order by grantee, privilege_type, column_name;
--   --   expect: only 'authenticated' / 'SELECT', and no invite_code or invite_code_hash.
--
--   -- 2. Policies: parent_links has exactly the two read-only ones; the three
--   --    "Parents can view their linked student's ..." policies are gone.
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('parent_links','courses','assignment_groups','assignments')
--   order by tablename, policyname;
--
--   -- 3. Function privileges: the first three must be service_role only, the
--   --    last two authenticated only. Every column below should read as listed.
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute')          as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
--          has_function_privilege('service_role', p.oid, 'execute')  as service_role,
--          p.prosecdef as security_definer, p.proconfig as settings
--   from pg_proc p
--   where p.pronamespace = 'public'::regnamespace
--     and p.proname in ('create_parent_invite','peek_parent_invite_v2','claim_parent_invite',
--                       'revoke_parent_link','leave_parent_link');
--   --   expect: anon = false everywhere; authenticated = false for the first three,
--   --   true for the last two; security_definer = true; settings has search_path=public.
--
--   -- 4. No plain-text codes remain, and no pending invite lacks a hash:
--   select count(*) filter (where invite_code is not null) as plaintext_codes,
--          count(*) filter (where status = 'pending')       as pending,
--          count(*) filter (where status = 'active')        as active
--   from parent_links;
--
--   -- 5. The attempts table is closed to users (expect no rows for these roles):
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_name = 'parent_invite_attempts' and grantee in ('anon','authenticated','public');
--
-- ------------------------------------------------------------------------
-- ROLLBACK (restores the old behaviour; only together with rolling the code
-- back to before this branch). One transaction. It cannot bring back the
-- plain-text codes that were erased or un-revoke the old pending invites; any
-- link that was active stays active.
--
-- begin;
--   drop function if exists revoke_parent_link(uuid);
--   drop function if exists leave_parent_link(uuid);
--   drop function if exists claim_parent_invite(uuid, text, integer, integer);
--   drop function if exists peek_parent_invite_v2(uuid, text, integer, integer);
--   drop function if exists create_parent_invite(uuid, text);
--   drop table if exists parent_invite_attempts;
--
--   -- old policies on parent_links
--   drop policy if exists "Students read their own parent links" on parent_links;
--   drop policy if exists "Parents read their own active links" on parent_links;
--   create policy "Students manage their own parent links" on parent_links
--     for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
--   create policy "Parents can view links where they are the parent" on parent_links
--     for select using (auth.uid() = parent_id);
--   revoke all on table parent_links from public, anon, authenticated;
--   grant select, insert, update, delete on table parent_links to authenticated;
--
--   -- old parent read policies on the student's data
--   create policy "Parents can view their linked student's courses" on courses for select using (
--     exists (select 1 from parent_links pl where pl.student_id = courses.user_id
--             and pl.parent_id = auth.uid() and pl.status = 'active'));
--   create policy "Parents can view their linked student's assignment groups" on assignment_groups for select using (
--     exists (select 1 from parent_links pl where pl.student_id = assignment_groups.user_id
--             and pl.parent_id = auth.uid() and pl.status = 'active'));
--   create policy "Parents can view their linked student's assignments" on assignments for select using (
--     exists (select 1 from parent_links pl where pl.student_id = assignments.user_id
--             and pl.parent_id = auth.uid() and pl.status = 'active'));
--
--   -- give every row a plain-text code again so the NOT NULL can come back
--   update parent_links set invite_code = md5(random()::text || id::text) where invite_code is null;
--   alter table parent_links alter column invite_code set not null;
--   drop index if exists parent_links_invite_code_hash_key;
--   alter table parent_links drop constraint if exists parent_links_pending_check;
--   alter table parent_links drop constraint if exists parent_links_ended_by_check;
--   alter table parent_links drop column if exists invite_code_hash,
--                            drop column if exists expires_at,
--                            drop column if exists ended_by;
--
--   -- old functions (from 0012_parent_links.sql)
--   create or replace function accept_parent_invite(p_invite_code text)
--   returns table (student_id uuid, student_email text) language plpgsql security definer
--   set search_path = public as $f$
--   declare v_row parent_links%rowtype; v_parent_email text;
--   begin
--     select * into v_row from parent_links
--       where invite_code = p_invite_code and status = 'pending' and parent_id is null;
--     if not found then raise exception 'This invite link is invalid or has already been used.'; end if;
--     if v_row.student_id = auth.uid() then raise exception 'You can''t link your own account as a parent viewer.'; end if;
--     select email into v_parent_email from auth.users where id = auth.uid();
--     update parent_links set parent_id = auth.uid(), parent_email = v_parent_email,
--            status = 'active', accepted_at = now() where id = v_row.id;
--     return query select v_row.student_id, v_row.student_email;
--   end; $f$;
--   revoke all on function accept_parent_invite(text) from public, anon;
--   grant execute on function accept_parent_invite(text) to authenticated;
--   create or replace function peek_parent_invite(p_invite_code text)
--   returns table (student_email text) language plpgsql security definer
--   set search_path = public as $f$
--   begin
--     return query select v.student_email from parent_links v
--       where v.invite_code = p_invite_code and v.status = 'pending' and v.parent_id is null;
--   end; $f$;
--   revoke all on function peek_parent_invite(text) from public, anon;
--   grant execute on function peek_parent_invite(text) to authenticated;
-- commit;
-- ------------------------------------------------------------------------
