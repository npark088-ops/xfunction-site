-- XFunction: tracks the semester-end grade projection the first time a
-- student sees it for a course, so it can later be compared against
-- what actually happened once more of the course is graded.
-- Run this once in the Supabase dashboard's SQL Editor, same as the other migrations.

create table if not exists grade_predictions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null,
  predicted_grade numeric not null,
  percent_graded_at_prediction numeric not null,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table grade_predictions enable row level security;

create policy "Users manage their own grade predictions"
  on grade_predictions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
