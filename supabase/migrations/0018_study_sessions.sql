-- XFunction: study session history
-- Run this once in the Supabase dashboard's SQL Editor, after 0017_onboarding_emails.sql.
--
-- One row per completed focus-timer session (see components/FocusTimer.tsx
-- and app/(dashboard)/grades/[courseId]/page.tsx, which logs a row when a
-- focus phase runs all the way to zero — skipped/interrupted sessions
-- aren't logged). occurred_at is when the session finished, used to place
-- it on the Schedule page's week/month calendar and to compute weekly
-- totals for the Overview summary card and Study Stats trends.

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  duration_minutes int not null check (duration_minutes > 0),
  occurred_at timestamptz not null default now()
);

alter table study_sessions enable row level security;

create policy "Users manage their own study sessions"
  on study_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_sessions_user_occurred_idx
  on study_sessions (user_id, occurred_at desc);
