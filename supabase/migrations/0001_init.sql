-- xFunction: user data tables
-- Run this once in the Supabase dashboard's SQL Editor (Project → SQL Editor → New query).
-- Every row is scoped to auth.uid() via Row Level Security, so users can
-- only ever read or write their own data — enforced by the database
-- itself, not just app code.

-- One Canvas connection per user (replaces the old in-memory mock token store).
create table if not exists canvas_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  token_type text not null default 'Bearer',
  expires_at timestamptz,
  canvas_user_id bigint not null,
  canvas_user_name text not null,
  updated_at timestamptz not null default now()
);

alter table canvas_connections enable row level security;

create policy "Users manage their own Canvas connection"
  on canvas_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tasks (replaces localStorage in app/tasks/page.tsx).
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  completed boolean not null default false,
  due_date date,
  ai_response text,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;

create policy "Users manage their own tasks"
  on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
