-- XFunction: Moodle + Blackboard connections
-- Run this once in the Supabase dashboard's SQL Editor, after 0019_platform_connections.sql.
--
-- Same shape/pattern as canvas_connections / google_classroom_connections
-- / schoology_connections (see 0001_init.sql, 0019_platform_connections.sql)
-- — one row per user per platform, RLS-scoped to auth.uid(). No tables
-- for the four SIS "coming soon" platforms (PowerSchool, Infinite
-- Campus, Skyward, StudentVUE/Synergy — see lib/sis-coming-soon.ts) —
-- there's nothing to persist for a connection that doesn't exist yet.

-- Moodle — real integration isn't OAuth at all (see lib/moodle-auth.ts):
-- it's a direct credential exchange against the school's own Moodle site
-- (login/token.php), so there's no single central host the way Canvas/
-- Google/Schoology/Blackboard have — site_url is per-user because every
-- school runs its own Moodle instance. The "token" has no expiry by
-- default in real Moodle (site admins can force one, but it's not part
-- of the response), so there's no expires_at column here either.
create table if not exists moodle_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  site_url text not null,
  token text not null,
  private_token text,
  moodle_user_id text not null,
  moodle_user_name text not null,
  updated_at timestamptz not null default now()
);

alter table moodle_connections enable row level security;

create policy "Users manage their own Moodle connection"
  on moodle_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Blackboard — real flow is OAuth2 (see lib/blackboard-oauth.ts),
-- structurally close to Canvas/Google but with its own host shape
-- (learn.school.edu, not a shared blackboard.com domain — same
-- "every school hosts their own instance" reality as Moodle and Canvas)
-- and HTTP Basic client authentication at the token endpoint instead of
-- client_secret in the POST body.
create table if not exists blackboard_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  blackboard_user_id text not null,
  blackboard_user_name text not null,
  updated_at timestamptz not null default now()
);

alter table blackboard_connections enable row level security;

create policy "Users manage their own Blackboard connection"
  on blackboard_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
