-- XFunction: additional LMS platform connections (Google Classroom, Schoology)
-- Run this once in the Supabase dashboard's SQL Editor, after 0018_study_sessions.sql.
--
-- Same shape/pattern as canvas_connections (see 0001_init.sql) — one row
-- per user per platform, RLS-scoped to auth.uid(). Deliberately separate
-- tables rather than one shared "platform_connections" table, since each
-- platform's real OAuth response carries different fields (Google's OIDC
-- id_token claims vs Schoology's OAuth1 token/secret pair vs Canvas's
-- token+user object) — forcing them into one generic JSON blob would lose
-- the type safety the per-platform token-store files rely on.
-- canvas_connections itself is untouched by this migration.

-- Google Classroom — real flow is OAuth2 + OIDC (see
-- lib/google-classroom-oauth.ts). access_token is short-lived;
-- refresh_token is only returned when access_type=offline was requested
-- and may be null on later re-authorizations Google doesn't re-issue one
-- for, same as real Google OAuth behavior.
create table if not exists google_classroom_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  scope text,
  google_user_id text not null,
  google_user_name text not null,
  google_user_email text,
  updated_at timestamptz not null default now()
);

alter table google_classroom_connections enable row level security;

create policy "Users manage their own Google Classroom connection"
  on google_classroom_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Schoology — real flow is OAuth 1.0a (see lib/schoology-oauth.ts), so
-- there's no single "access_token" string; every API request is signed
-- with a token key/secret pair instead of a bearer header. Access tokens
-- don't expire the way OAuth2 ones typically do, so there's no
-- expires_at column here.
create table if not exists schoology_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  access_token_secret text not null,
  schoology_user_id text not null,
  schoology_user_name text,
  updated_at timestamptz not null default now()
);

alter table schoology_connections enable row level security;

create policy "Users manage their own Schoology connection"
  on schoology_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No table for PowerSchool: it's a UI-only "coming soon" placeholder
-- (see lib/powerschool-oauth-config.ts) with no working connect flow yet,
-- so there's nothing to persist.
