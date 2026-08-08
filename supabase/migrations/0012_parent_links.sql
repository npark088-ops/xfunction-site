-- XFunction: parent/guardian read-only access
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.
--
-- One row per invite/link. student_id is set at creation time (the
-- student inviting); parent_id stays null until a parent claims the
-- invite code. Both *_email columns are captured directly from each
-- side's own session at insert/claim time, so nothing here ever needs
-- to look up another user's profile — avoids any cross-user read
-- beyond what these two SECURITY DEFINER functions explicitly allow.

create table if not exists parent_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_email text not null,
  parent_id uuid references auth.users(id) on delete cascade,
  parent_email text,
  invite_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

alter table parent_links enable row level security;

-- The student who created the invite fully owns and manages the row:
-- creating it (insert), listing it (select), and revoking it (update).
create policy "Students manage their own parent links"
  on parent_links
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

-- A parent can see the links where they're the linked party (used by
-- the /parent dashboard to list which students shared access), but
-- cannot claim one this way — see accept_parent_invite below for why.
create policy "Parents can view links where they are the parent"
  on parent_links
  for select
  using (auth.uid() = parent_id);

-- Claiming an invite means updating a row the parent doesn't own yet
-- (student_id isn't them, and parent_id is still null) — normal RLS
-- can't express "let me attach myself to this row," so this runs with
-- the privileges of whichever role created it (postgres), same
-- SECURITY DEFINER pattern as set_pro_on_checkout (0003) and
-- delete_own_account (0008). It re-validates everything itself rather
-- than trusting the caller: code must be pending and unclaimed, and a
-- student can't link their own account as its own parent viewer.
create or replace function accept_parent_invite(p_invite_code text)
returns table (student_id uuid, student_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row parent_links%rowtype;
  v_parent_email text;
begin
  select * into v_row
    from parent_links
    where invite_code = p_invite_code and status = 'pending' and parent_id is null;

  if not found then
    raise exception 'This invite link is invalid or has already been used.';
  end if;

  if v_row.student_id = auth.uid() then
    raise exception 'You can''t link your own account as a parent viewer.';
  end if;

  select email into v_parent_email from auth.users where id = auth.uid();

  update parent_links
    set parent_id = auth.uid(),
        parent_email = v_parent_email,
        status = 'active',
        accepted_at = now()
    where id = v_row.id;

  return query select v_row.student_id, v_row.student_email;
end;
$$;

grant execute on function accept_parent_invite(text) to authenticated;

-- Read-only preview so the join page can show "you're about to link
-- to <email>" before the parent commits — deliberately returns
-- nothing more than the student's email, and only for a still-pending
-- code (which the caller already has to know).
create or replace function peek_parent_invite(p_invite_code text)
returns table (student_email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select v.student_email
    from parent_links v
    where v.invite_code = p_invite_code and v.status = 'pending' and v.parent_id is null;
end;
$$;

grant execute on function peek_parent_invite(text) to authenticated;
