-- xFunction: per-user assignment "done" tracking
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.
--
-- Separate from Canvas's own graded/ungraded state (assignment.submission
-- in the mock data) — this is purely "has the student marked this done
-- for themselves." Presence of a row = done; no row = not done.

create table if not exists assignment_completions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assignment_id bigint not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, assignment_id)
);

alter table assignment_completions enable row level security;

create policy "Users manage their own assignment completions"
  on assignment_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
