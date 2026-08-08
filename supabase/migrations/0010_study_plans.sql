-- XFunction: saved/edited study plans per course
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.
--
-- A study plan starts as AI-generated (see app/api/study-plan) but the
-- student can then hand-edit it (add/remove/reorder/reword steps) on
-- the Grades page — this table is what makes those edits (and even an
-- unedited generated plan) survive a page reload instead of vanishing.

create table if not exists study_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  plan jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table study_plans enable row level security;

create policy "Users manage their own study plans"
  on study_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
